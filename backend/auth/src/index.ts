import express from "express";

const app = express();

const PORT = Number(process.env.PORT);

if (!PORT) {
    console.log("Port isnt defined in env variables.");
    process.exit(1);
}

app.use(express.json());

app.listen(PORT, () => {
    console.log(`Connected to port ${PORT}`);
});
