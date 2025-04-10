require("dotenv").config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");
const axios = require("axios");
const cheerio = require("cheerio");
const googles = require("./model/modelSchema");

app.use(cors());
const PORT = process.env.PORT || 5500;

app.listen(PORT, async () => {
  try {
    await mongoose
      .connect(process.env.MONGODB_URL)
      .then(() => {
        console.log("Mongodb connected successfully ");
      })
      .catch((err) =>
        console.error("Error connecting to MongoDB", err.message)
      );
  } catch (error) {
    console.error("fetching database error", error);
  }
  console.log(`Server is running on port ${PORT}`);
});

// Middleware
app.use(express.json());

app.get("/search", async (req, res) => {
  const query = req.query.name;

  try {
    const results = await googles.find({ Title: new RegExp(query, "i") });
    res.json(results);
  } catch (error) {
    console.log("Error in database:", error);
    res.status(500).json({ error: "Internal Server" });
  }
});

const checkUrlWithVirusTotal = async (url) => {
  const apiKey =
    "45c2b786af7de70b509aee796449a6b0f528d3cb066352da2a24a0c4512f5836";
  const endpoint = "https://www.virustotal.com/api/v3/urls";

  try {
    const submitResponse = await axios.post(
      endpoint,
      new URLSearchParams({ url }),
      {
        headers: {
          "x-apikey": apiKey,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const analysisId = submitResponse.data.data.id;


    let scanResponse;
    for (let i = 0; i < 5; i++) {
      scanResponse = await axios.get(
        `https://www.virustotal.com/api/v3/analyses/${analysisId}`,
        { headers: { "x-apikey": apiKey } }
      );

      if (scanResponse.data.data.attributes.status === "completed") break;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const scanData = scanResponse.data.data.attributes;
    const maliciousCount = scanData.stats.malicious || 0;
    const suspiciousCount = scanData.stats.suspicious || 0;

    return {
      status: maliciousCount > 0 || suspiciousCount > 0 ? "malicious" : "safe",
      threatInfo: scanData.stats,
    };
  } catch (error) {
    console.error(
      `VirusTotal API Error: ${error.response?.data || error.message}`
    );
    return { status: "unknown", threatInfo: null };
  }
};

const crawl = async (startUrl) => {
  const queue = [startUrl];
  const visited = new Set();
  let crawledCount = 0;

  while (queue.length > 0 && crawledCount < 20) {
    const currentUrl = queue.shift();

    if (visited.has(currentUrl)) {
      continue;
    }

    try {
      const response = await axios.get(currentUrl);
      const $ = cheerio.load(response.data);

      const title = $("title").text();
      const desc = $('meta[name="description"]').attr("content") || "";

      const links = [];
      $("a").each((_, element) => {
        let link = $(element).attr("href");

        if (link) {
          try {
            link = new URL(link, currentUrl).href;
          } catch {
            return;
          }

          const isSameDomain = link.startsWith(new URL(currentUrl).origin);
          const isCleanLink = !link.includes("#") && !link.includes("?");
          const isContentPage = /\.(html?|php|asp|aspx)?$/.test(link);

          if (
            !visited.has(link) &&
            isSameDomain &&
            isCleanLink &&
            isContentPage &&
            (link.startsWith("http://") || link.startsWith("https://"))
          ) {
            links.push(link);
            queue.push(link);
          }
        }
      });

      visited.add(currentUrl);
      crawledCount++;

      const virusTotalResult = await checkUrlWithVirusTotal(currentUrl);

      const page = new googles({
        Url: currentUrl,
        Title: title,
        Description: desc,
        links: links,
        ScanStatus: virusTotalResult.status,
        threatInfo: virusTotalResult.threatInfo,
      });
      await page.save();
      console.log(
        `Crawled and Scanned ! ${currentUrl} - Status:${virusTotalResult.status}`
      );
    } catch (error) {
      console.error(`Error crawling ${currentUrl}: ${error.message}`);
    }
  }
  console.log("SUCCESSFULLY CRAWLED 20 PAGES ....!!!");
};

app.post("/crawl", async (req, res) => {
  const { url } = req.body;
  if (!url) console.log("url required.......!!!!");

  await crawl(url);
  res.send("Crawling started");
});

app.post("/rescan", async (req, res) => {
  try {
    const pages = await googles.find({ scanStatus: "pending" });

    for (const page of pages) {
      const virusTotalResult = await checkUrlWithVirusTotal(page.Url);

      page.ScanStatus = virusTotalResult.status;
      page.threatInfo = virusTotalResult.threatInfo;

      await page.save();
      console.log(
        `Re-scanned: ${page.Url} - Status: ${virusTotalResult.status}`
      );
    }

    res.send("Re-scan completed for pending links.");
  } catch (error) {
    console.error("Error during re-scan:", error.message);
    res.status(500).send("Error during re-scan.");
  }
});

app.post("/malicious", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "Invalid URL format" });
  }

  console.log(`Testing URL manually: ${url}`);

  const scanResult = await checkUrlWithVirusTotal(url);

  res.json({
    url,
    status: scanResult.status,
    details: scanResult.threatInfo,
  });
});
