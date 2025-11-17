import "reflect-metadata";
import { ApolloServer } from "apollo-server-express";
import express from "express";
import bodyParser from "body-parser";
import { buildSchema } from "type-graphql";
import { UserResolver } from "./resolvers/UserResolver";
import { connectMongoDB } from "./config/mongodb";
import { AppDataSource } from "./config/postgres";
import { logger } from "./utils/logger";
import { authContext } from "./middleware/authContext";
import dotenv from "dotenv";

dotenv.config();

async function bootstrap() {
  try {
    // ✅ Connect to MongoDB
    await connectMongoDB();

    // ✅ Initialize PostgreSQL only if not already connected
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.info(`✅ PostgreSQL connected`);
    } else {
      logger.info(`ℹ️ PostgreSQL already initialized`);
    }

    // ✅ Build GraphQL schema
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
      introspection: true, // Allow GraphQL tools to load schema
      context: ({ req, res }) => authContext({ req, res }),
    });

    await server.start();
    server.applyMiddleware({ app });

    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
      logger.info(
        `🚀 GraphQL running at http://localhost:${PORT}${server.graphqlPath}`
      );
      logger.info("✅ Clerk webhook endpoint: POST /webhooks/clerk");
    });
  } catch (err) {
    logger.error("❌ Server bootstrap failed:", err);
    process.exit(1); // Exit if bootstrap fails
  }
}

bootstrap();
