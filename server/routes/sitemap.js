const Post = require("../models/Post.js");

const escapeXml = (s) =>
  String(s).replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]
  );

const baseUrl = () =>
  (process.env.CLIENT_ORIGIN || "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean)[0] || "http://localhost:5173";

// Public sitemap: homepage + every published post.
module.exports = async (req, res) => {
  try {
    const base = baseUrl();
    const posts = await Post.find({ status: { $ne: "draft" } })
      .select("updatedAt createdAt")
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean();

    const urls = [`  <url><loc>${escapeXml(base)}/</loc></url>`];
    for (const p of posts) {
      const lastmod = new Date(p.updatedAt || p.createdAt).toISOString();
      urls.push(
        `  <url><loc>${escapeXml(`${base}/post/${p._id}`)}</loc><lastmod>${lastmod}</lastmod></url>`
      );
    }

    res
      .type("application/xml")
      .send(
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`
      );
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error" });
  }
};
