import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

admin.initializeApp({
  projectId: firebaseConfig.projectId,
});

const db = admin.firestore();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Authentication Middleware
  const authMiddleware = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split("Bearer ")[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      const userDoc = await db.collection("users").doc(decodedToken.uid).get();
      
      if (!userDoc.exists) {
        return res.status(403).json({ error: "User profile not found" });
      }

      const userData = userDoc.data();
      req.user = { ...decodedToken, ...userData };
      req.companyId = userData?.companyId;

      if (!req.companyId) {
        return res.status(403).json({ error: "No company associated with user" });
      }

      next();
    } catch (error) {
      console.error("Auth error:", error);
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // Multi-tenant API Routes
  app.get("/api/budgets", authMiddleware, async (req: any, res: any) => {
    try {
      const snapshot = await db.collection("budgets")
        .where("companyId", "==", req.companyId)
        .orderBy("createdAt", "desc")
        .get();
      
      const budgets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(budgets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch budgets" });
    }
  });

  app.post("/api/budgets", authMiddleware, async (req: any, res: any) => {
    try {
      const budgetData = {
        ...req.body,
        companyId: req.companyId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      const docRef = await db.collection("budgets").add(budgetData);
      res.status(201).json({ id: docRef.id, ...budgetData });
    } catch (error) {
      res.status(500).json({ error: "Failed to create budget" });
    }
  });

  app.get("/api/clients", authMiddleware, async (req: any, res: any) => {
    try {
      const snapshot = await db.collection("clients")
        .where("companyId", "==", req.companyId)
        .orderBy("name", "asc")
        .get();
      const clients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(clients);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.post("/api/clients", authMiddleware, async (req: any, res: any) => {
    try {
      const clientData = {
        ...req.body,
        companyId: req.companyId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      const docRef = await db.collection("clients").add(clientData);
      res.status(201).json({ id: docRef.id, ...clientData });
    } catch (error) {
      res.status(500).json({ error: "Failed to create client" });
    }
  });

  app.get("/api/vehicles", authMiddleware, async (req: any, res: any) => {
    try {
      const snapshot = await db.collection("vehicles")
        .where("companyId", "==", req.companyId)
        .orderBy("plate", "asc")
        .get();
      const vehicles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(vehicles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vehicles" });
    }
  });

  app.post("/api/vehicles", authMiddleware, async (req: any, res: any) => {
    try {
      const vehicleData = {
        ...req.body,
        companyId: req.companyId,
      };
      const docRef = await db.collection("vehicles").add(vehicleData);
      res.status(201).json({ id: docRef.id, ...vehicleData });
    } catch (error) {
      res.status(500).json({ error: "Failed to create vehicle" });
    }
  });

  app.get("/api/services", authMiddleware, async (req: any, res: any) => {
    try {
      const snapshot = await db.collection("services")
        .where("companyId", "==", req.companyId)
        .where("active", "==", true)
        .get();
      const services = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(services);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  app.post("/api/services", authMiddleware, async (req: any, res: any) => {
    try {
      const serviceData = {
        ...req.body,
        companyId: req.companyId,
      };
      const docRef = await db.collection("services").add(serviceData);
      res.status(201).json({ id: docRef.id, ...serviceData });
    } catch (error) {
      res.status(500).json({ error: "Failed to create service" });
    }
  });

  app.patch("/api/services/:id", authMiddleware, async (req: any, res: any) => {
    try {
      const serviceRef = db.collection("services").doc(req.params.id);
      const doc = await serviceRef.get();
      
      if (!doc.exists || doc.data()?.companyId !== req.companyId) {
        return res.status(404).json({ error: "Service not found" });
      }

      await serviceRef.update(req.body);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update service" });
    }
  });

  app.post("/api/budgets", authMiddleware, async (req: any, res: any) => {
    try {
      const budgetData = {
        ...req.body,
        companyId: req.companyId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        deliveryDate: req.body.deliveryDate ? admin.firestore.Timestamp.fromDate(new Date(req.body.deliveryDate)) : null,
      };
      const docRef = await db.collection("budgets").add(budgetData);
      res.status(201).json({ id: docRef.id, ...budgetData });
    } catch (error) {
      console.error("Error creating budget:", error);
      res.status(500).json({ error: "Failed to create budget" });
    }
  });

  app.patch("/api/budgets/:id/status", authMiddleware, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const companyId = req.user.companyId;

      const budgetRef = db.collection("budgets").doc(id);
      const budget = await budgetRef.get();

      if (!budget.exists || budget.data()?.companyId !== companyId) {
        return res.status(404).json({ error: "Budget not found" });
      }

      await budgetRef.update({
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating budget status:", error);
      res.status(500).json({ error: "Failed to update budget status" });
    }
  });

  app.patch("/api/budgets/:id/payment", authMiddleware, async (req: any, res: any) => {
    try {
      const budgetRef = db.collection("budgets").doc(req.params.id);
      const doc = await budgetRef.get();
      
      if (!doc.exists || doc.data()?.companyId !== req.companyId) {
        return res.status(404).json({ error: "Budget not found" });
      }

      await budgetRef.update({
        ...req.body,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update payment status" });
    }
  });

  app.get("/api/company", authMiddleware, async (req: any, res: any) => {
    try {
      const doc = await db.collection("companies").doc(req.companyId).get();
      if (!doc.exists) return res.status(404).json({ error: "Company not found" });
      res.json({ id: doc.id, ...doc.data() });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch company" });
    }
  });

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Public Endpoints
  app.get("/api/public/company/:id", async (req: any, res: any) => {
    try {
      const doc = await db.collection("companies").doc(req.params.id).get();
      if (!doc.exists) {
        return res.status(404).json({ error: "Company not found" });
      }
      res.json({ id: doc.id, ...doc.data() });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch company" });
    }
  });

  app.get("/api/public/budgets/:companyId/:plate", async (req: any, res: any) => {
    try {
      const { companyId, plate } = req.params;
      const snapshot = await db.collection("budgets")
        .where("companyId", "==", companyId)
        .where("vehiclePlate", "==", plate.toUpperCase())
        .orderBy("createdAt", "desc")
        .limit(3)
        .get();

      const budgets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(budgets);
    } catch (error) {
      console.error("Error in public lookup:", error);
      res.status(500).json({ error: "Failed to lookup budgets" });
    }
  });

  app.post("/api/setup", async (req: any, res: any) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;
      const email = decodedToken.email;

      const { companyName } = req.body;

      // 1. Create Company
      const companyRef = await db.collection("companies").add({
        name: companyName,
        email: email,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      const companyId = companyRef.id;

      // 2. Create User Profile
      await db.collection("users").doc(uid).set({
        name: decodedToken.name || "Usuário",
        email: email,
        role: "admin",
        companyId,
      });

      res.status(201).json({ companyId });
    } catch (error) {
      console.error("Error in setup:", error);
      res.status(500).json({ error: "Failed to setup company" });
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
