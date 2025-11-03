import "reflect-metadata";
import { ApolloServer } from "apollo-server-express";
import express from "express";
import bodyParser from "body-parser";
import { buildSchema } from "type-graphql";
import { UserResolver } from "./resolvers/UserResolver";
import { connectMongoDB } from "./config/mongodb";
import { AppDataSource } from "./config/postgres";
import { auth } from "./middleware/auth";
import { clerkWebhook } from "./webhooks/clerk";
import { logger } from "./utils/logger";
import dotenv from "dotenv";
dotenv.config();
async function bootstrap() {
  await connectMongoDB();
  await AppDataSource.initialize();
logger.info(`✅ PostgreSQL connected`);

  const schema = await buildSchema({
    resolvers: [UserResolver],
  });

  const app = express();

  // ✅ Clerk Webhook must receive RAW body
  app.post(
    "/webhooks/clerk",
    bodyParser.raw({ type: "application/json" }),
    (req: any, res) => {
      req.rawBody = req.body;
      clerkWebhook(req, res);
    }
  );

  // ✅ Normal JSON for API & GraphQL
  app.use(bodyParser.json());
  // Apollo server setupS
  const server = new ApolloServer({
    schema,
    context: async ({ req }) => {
      const session = await auth(req);
      return { session };
    },
  });

  await server.start(); 
  server.applyMiddleware({ app });

  const PORT = 4000;
  app.listen(PORT, () => {
    logger.info(`🚀 GraphQL running at http://localhost:${PORT}${server.graphqlPath}`);
    logger.info("✅ Clerk webhook endpoint: POST /webhooks/clerk");
  });
}

bootstrap();
