const express = require("express");
const fs = require("fs/promises");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "data");
const DATA_FILE = path.join(DATA_DIR, "applications.json");

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

/* =========================
   FRONTEND FILE ROUTES
========================= */

app.get("/", (req, res) => {
    res.sendFile(path.join(ROOT_DIR, "index.html"));
});

app.get("/style.css", (req, res) => {
    res.sendFile(path.join(ROOT_DIR, "style.css"));
});

app.get("/script.js", (req, res) => {
    res.sendFile(path.join(ROOT_DIR, "script.js"));
});

app.get("/bg2-01.jpg", (req, res) => {
    res.sendFile(path.join(ROOT_DIR, "bg2-01.jpg"));
});

app.get("/bg2-02.jpg", (req, res) => {
    res.sendFile(path.join(ROOT_DIR, "bg2-02.jpg"));
});

/* =========================
   DATA HELPERS
========================= */

async function ensureDataFile() {
    await fs.mkdir(DATA_DIR, { recursive: true });

    try {
        await fs.access(DATA_FILE);
    } catch {
        await fs.writeFile(DATA_FILE, "[]", "utf8");
    }
}

async function readApplications() {
    await ensureDataFile();

    try {
        const fileData = await fs.readFile(DATA_FILE, "utf8");
        const parsedData = JSON.parse(fileData || "[]");

        if (!Array.isArray(parsedData)) {
            return [];
        }

        return parsedData;
    } catch (error) {
        console.error("JSON read/parse error:", error);
        return [];
    }
}

async function saveApplications(applications) {
    await ensureDataFile();
    await fs.writeFile(DATA_FILE, JSON.stringify(applications, null, 2), "utf8");
}

function cleanValue(value) {
    if (typeof value === "string") {
        return value.trim();
    }

    return value;
}

function cleanApplicationData(data) {
    const cleaned = {};

    Object.keys(data || {}).forEach((key) => {
        const value = data[key];

        if (Array.isArray(value)) {
            cleaned[key] = value.map(cleanValue).filter((item) => item !== "");
        } else {
            cleaned[key] = cleanValue(value);
        }
    });

    return cleaned;
}

function validateApplication(data) {
    const requiredFields = [
        "applicant_full_name",
        "marital_status",
        "address_line_1",
        "city",
        "state",
        "zip_code",
        "cell_phone",
        "email",
        "next_of_kin_name",
        "next_of_kin_phone",
        "agreement",
        "applicant_signature",
        "date_signed"
    ];

    const missingFields = requiredFields.filter((field) => {
        return !data[field] || String(data[field]).trim() === "";
    });

    if (data.marital_status === "Married" && !data.spouse_full_name) {
        missingFields.push("spouse_full_name");
    }

    return missingFields;
}

function generateApplicationId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 100000);
    return `EEMAA-${timestamp}-${random}`;
}

/* =========================
   API ROUTES
========================= */

app.post("/api/membership", async (req, res) => {
    try {
        const applicationData = cleanApplicationData(req.body);
        const missingFields = validateApplication(applicationData);

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Please complete all required fields.",
                missingFields
            });
        }

        const applications = await readApplications();

        const newApplication = {
            id: generateApplicationId(),
            submitted_at: new Date().toISOString(),
            ...applicationData
        };

        applications.push(newApplication);

        await saveApplications(applications);

        return res.status(201).json({
            success: true,
            message: "Application submitted successfully.",
            application_id: newApplication.id
        });

    } catch (error) {
        console.error("Submit error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error. Please try again."
        });
    }
});

app.get("/api/applications", async (req, res) => {
    try {
        const applications = await readApplications();

        return res.json({
            success: true,
            count: applications.length,
            data: applications
        });

    } catch (error) {
        console.error("Read error:", error);

        return res.status(500).json({
            success: false,
            message: "Could not read applications."
        });
    }
});

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "EEMAA backend is running."
    });
});

/* =========================
   404 ROUTE
========================= */

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found."
    });
});

/* =========================
   START SERVER
========================= */

app.listen(PORT, () => {
    console.log(`EEMAA backend running on port ${PORT}`);
    console.log(`Open locally: http://localhost:${PORT}`);
});