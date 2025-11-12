import "reflect-metadata";
import { ApolloServer } from "apollo-server-express";
import express from "express";
import bodyParser from "body-parser";
import { buildSchema } from "type-graphql";
import { UserResolver } from "./resolvers/UserResolver";
import { connectMongoDB } from "./config/mongodb";
import { AppDataSource } from "./config/postgres";
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

  // ✅ Parse JSON for everything EXCEPT /graphql
  app.use((req, res, next) => {
    if (req.path === "/graphql") return next();
    bodyParser.json()(req, res, next);
  });

  // ✅ Apollo Server setup
  const server = new ApolloServer({
    schema,
    context: ({ req, res }) => ({ req, res }),
  });

  await server.start();
  server.applyMiddleware({ app });

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    logger.info(`🚀 GraphQL running at http://localhost:${PORT}${server.graphqlPath}`);
    logger.info("✅ Clerk webhook endpoint: POST /webhooks/clerk");
  });
}

bootstrap();
