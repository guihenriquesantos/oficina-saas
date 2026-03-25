import express from "express";
import cors from "cors";
import admin from "firebase-admin";

// Inicialização do Firebase Admin
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // 🌐 PRODUÇÃO (Render)
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    ),
  });
} else {
  // 💻 LOCAL
  const serviceAccount = require("./serviceAccountKey.json");

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json());

// Middleware de autenticação
async function authMiddleware(req: any, res: any, next: any) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token não fornecido" });
    }

    const token = authHeader.split(" ")[1];

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;

    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).json({ error: "Invalid token" });
  }
}

// Rota para cadastrar cliente
app.post("/clients", authMiddleware, async (req: any, res: any) => {
  try {
    const { name, phone } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: "Dados inválidos" });
    }

    const uid = req.user.uid;

    // Verifica se o usuário existe no Firestore
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return res.status(403).json({ error: "User profile not found" });
    }

    const userData = userDoc.data();
    const companyId = userData?.companyId;

    if (!companyId) {
      return res.status(400).json({ error: "Usuário sem empresa vinculada" });
    }

    // Cria cliente vinculado à empresa
    const newClient = {
      name,
      phone,
      companyId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("clients").add(newClient);

    return res.status(201).json({
      message: "Cliente criado com sucesso",
      id: docRef.id,
    });
  } catch (error) {
    console.error("Error adding client:", error);
    return res.status(500).json({ error: "Erro ao cadastrar cliente" });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
