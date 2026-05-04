const express = require("express");
const fs = require("fs/promises");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "data");
const DATA_FILE = path.join(DATA_DIR, "applications.json");

// Serve frontend files safely
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

async function ensureDataFile() {
    await fs.mkdir(DATA_DIR, { recursive: true });

    try {
        await fs.access(DATA_FILE);
    } catch {
        await fs.writeFile(DATA_FILE, "[]", "utf8");
    }
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

    return missingFields;
}

app.post("/api/membership", async (req, res) => {
    try {
        await ensureDataFile();

        const applicationData = req.body;
        const missingFields = validateApplication(applicationData);

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Please complete all required fields.",
                missingFields
            });
        }

        const newApplication = {
            id: Date.now().toString(),
            submitted_at: new Date().toISOString(),
            ...applicationData
        };

        const existingData = await fs.readFile(DATA_FILE, "utf8");
        const applications = JSON.parse(existingData || "[]");

        applications.push(newApplication);

        await fs.writeFile(DATA_FILE, JSON.stringify(applications, null, 2), "utf8");

        res.status(201).json({
            success: true,
            message: "Application submitted successfully.",
            application_id: newApplication.id
        });

    } catch (error) {
        console.error("Submit error:", error);

        res.status(500).json({
            success: false,
            message: "Server error. Please try again."
        });
    }
});

// View saved applications in browser
app.get("/api/applications", async (req, res) => {
    try {
        await ensureDataFile();

        const existingData = await fs.readFile(DATA_FILE, "utf8");
        const applications = JSON.parse(existingData || "[]");

        res.json({ 

            success: true,
            count: applications.length,
            data: applications
        });

    } catch (error) {
        console.error("Read error:", error);

        res.status(500).json({
            success: false,
            message: "Could not read applications."
        });
    }
});

app.listen(PORT, () => {
    console.log(`EEMAA backend running here: http://localhost:${PORT}`);
});