import neo4j from "neo4j-driver";
import { config } from "dotenv";
config();

const URI = process.env.NEO_URI;
const USER = process.env.NEO_USER;
const PASSWORD = process.env.NEO_PASSWORD;

if (!URI || !USER || !PASSWORD) {
  console.error("Neo4j credentials not set up.");
  process.exit(1);
}
let driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD));
const connectToNeo = async () => {
  const serverInfo = await driver.getServerInfo();
  console.log("Connected to Neo");
  console.log(serverInfo);
};

export { connectToNeo, driver };
