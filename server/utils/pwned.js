const crypto = require("crypto");

// Checks a password against the HaveIBeenPwned range API using k-anonymity:
// only the first 5 hex chars of the SHA-1 hash ever leave the server.
// Fails open: any network/parse problem means "not known to be breached".
const isPasswordBreached = async (password) => {
  if (process.env.NODE_ENV === "test" && process.env.PWNED_CHECK !== "on") {
    return false;
  }
  try {
    const hash = crypto
      .createHash("sha1")
      .update(password)
      .digest("hex")
      .toUpperCase();
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    const response = await fetch(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      {
        headers: { "Add-Padding": "true" },
        signal: AbortSignal.timeout(2000),
      }
    );
    if (!response.ok) return false;

    const text = await response.text();
    for (const line of text.split(/\r?\n/)) {
      const [lineSuffix, count] = line.trim().split(":");
      if (lineSuffix === suffix) return parseInt(count, 10) > 0;
    }
    return false;
  } catch {
    return false;
  }
};

module.exports = { isPasswordBreached };
