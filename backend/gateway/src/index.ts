import express from "express";
import axios from "axios";
import { config } from "dotenv";
import cors from "cors";

config();

const PORT = process.env.PORT;
const AUTH_URL = process.env.AUTH_URL;
const FOLLOW_URL = process.env.FOLLOW_URL;
const
    POST_URL = process.env.POST_URL;
const FRONTEND_URL = process.env.FRONTEND_URL;

if (!PORT || !AUTH_URL || !FOLLOW_URL || !POST_URL || !FRONTEND_URL ) {
  console.log(`Env in incomplete.`);
  console.log(`PORT is ${PORT}`);
  console.log(`AUTH URL is ${AUTH_URL}`);
  console.log(`FOLLOW URL is ${FOLLOW_URL}`);
  console.log(`POST URL is ${POST_URL}`);
  console.log(`FRONTEND URL is ${FRONTEND_URL}`);
  process.exit(1);
}

const app = express();

app.use(cors());
app.use(express.json());

app.post("/",  async (req, res) => {
    console.log(req.body);
  let serviceUrl;
  const { service, method, body, path, query, headers } = req.body;

  if (!service || !method || !path) {
    return res.status(400).json({ success: false, message: "Invalid req." });
  }

  switch (service) {
    case "AUTH":
      serviceUrl = AUTH_URL;
      break;
    case "FOLLOW":
      serviceUrl = FOLLOW_URL;
      break;
    case "POST":
      serviceUrl = POST_URL;
      break;
    default:
      return res.status(500).json({
        success: false,
        message: "Invalid Request. Service isn't defined properly.",
      });
  }

  if (method === "GET") {
    try {
      const result = await axios.get(
        serviceUrl + path + (query || ""),
        headers ? { headers: JSON.parse(headers) } : undefined,
      );
      return res.status(result.status).json({ ...result.data });
    } catch (e) {
      console.error(e);
      return res.status(502).json({ success: false, message: "Bad Gateway." });
    }
  } else {
    try {
      const result = await axios({
        method,
        url: serviceUrl + path + (query || ""),
        data: body ? body : undefined,
        headers: headers ? JSON.parse(headers) : undefined,
      });

      return res.status(result.status).json({...result.data});
    } catch (e) {
      console.error(e);
      return res.status(502).json({ success: false, message: "Bad Gateway." });
    }
  }
});

app.listen(PORT, () => console.log(`Console running on port ${PORT}`));
