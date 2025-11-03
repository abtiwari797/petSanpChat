import { clerk } from "../config/clerk";

export const auth = async (req: any) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) return null;

  // Format: "Bearer sessionId sessionToken"
  const [ , sessionId, sessionToken ] = authHeader.split(" ");

  if (!sessionId || !sessionToken) return null;

  try {
    const session = await clerk.sessions.verifySession(sessionId, sessionToken);
    return session;
  } catch (error) {
    console.error("❌ Clerk session verification failed:", error);
    return null;
  }
};
