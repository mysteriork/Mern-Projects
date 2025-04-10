const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const cheerio = require("cheerio");
const googles = require("./model/modelSchema");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

mongoose
  .connect("mongodb://localhost:27017/crawler")
  .then(() => {
    console.log("database connected !!!");

    app.listen(PORT, () => {
      console.log(`Server running on ${PORT}`);
    });
  })
  .catch((err) => console.log("error connecting DB", err.message));

app.use(express.json());

const crawl = async (startUrl) => {
  const queue = [startUrl];
  const visited = new Set();
  let crawledCount = 0;

  while (queue.length > 0 && crawledCount < 10) {
    const currentUrl = queue.shift();

    if (visited.has(currentUrl)) {
      continue;
    }

    try {
      const response = await axios.get(currentUrl);
      const $ = cheerio.load(response.data);
      const content = response.data;

      const title = $("title").text();

      const links = [];
      $("a").each((_, element) => {
        const link = $(element).attr("href");
        if (link && !visited.has(link)) {
          links.push(link);
          queue.push(link);
        }
      });

      visited.add(currentUrl);
      crawledCount++;

      const page = new Page({ url: currentUrl, title, content, links });
      await page.save();
      console.log(`Crawled: ${currentUrl}`);
    } catch (error) {
      console.error(`Error crawling ${currentUrl}: ${error.message}`);
    }
  }
};

app.post("/crawl", async (req, res) => {
  const { url } = req.body;
  await crawl(url);
  res.send("Crawling started");
});
