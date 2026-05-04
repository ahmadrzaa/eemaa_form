const form = document.getElementById("membershipForm");
const maritalStatus = document.getElementById("maritalStatus");
const spouseFields = document.querySelectorAll(".spouse-field");
const spouseBeneficiary = document.getElementById("spouseBeneficiary");
const beneficiaryFields = document.getElementById("beneficiaryFields");
const formMessage = document.getElementById("formMessage");

function updateCheckboxCards() {
    const checkboxCards = document.querySelectorAll(".eemaa-checkbox-card");

    checkboxCards.forEach((card) => {
        const checkbox = card.querySelector('input[type="checkbox"]');

        if (!checkbox) return;

        card.classList.toggle("is-checked", checkbox.checked);
    });
}

function bindCheckboxCards() {
    const checkboxes = document.querySelectorAll('.eemaa-checkbox-card input[type="checkbox"]');

    checkboxes.forEach((checkbox) => {
        checkbox.addEventListener("change", updateCheckboxCards);

        checkbox.addEventListener("focus", () => {
            const card = checkbox.closest(".eemaa-checkbox-card");
            if (card) card.classList.add("is-focused");
        });

        checkbox.addEventListener("blur", () => {
            const card = checkbox.closest(".eemaa-checkbox-card");
            if (card) card.classList.remove("is-focused");
        });
    });

    updateCheckboxCards();
}

function toggleSpouseFields() {
    const isMarried = maritalStatus && maritalStatus.value === "Married";

    spouseFields.forEach((field) => {
        field.classList.toggle("is-hidden", !isMarried);
    });

    if (!isMarried && spouseBeneficiary) {
        spouseBeneficiary.checked = false;
        toggleBeneficiaryFields();
    }

    updateCheckboxCards();
}

function toggleBeneficiaryFields() {
    if (!spouseBeneficiary || !beneficiaryFields) return;

    beneficiaryFields.classList.toggle("is-hidden", spouseBeneficiary.checked);
    updateCheckboxCards();
}

function clearErrors() {
    if (!form) return;

    const errorFields = form.querySelectorAll(".field-error");

    errorFields.forEach((field) => {
        field.classList.remove("field-error");
    });

    if (formMessage) {
        formMessage.textContent = "";
        formMessage.className = "eemaa-message";
    }
}

function validateForm() {
    clearErrors();

    let valid = true;
    const requiredFields = form.querySelectorAll("[required]");

    requiredFields.forEach((field) => {
        const hiddenParent = field.closest(".is-hidden");

        if (hiddenParent) return;

        if (field.type === "checkbox" && !field.checked) {
            const card = field.closest(".eemaa-checkbox-card");
            if (card) card.classList.add("field-error");
            valid = false;
            return;
        }

        if (field.type !== "checkbox" && !field.value.trim()) {
            field.classList.add("field-error");
            valid = false;
        }
    });

    return valid;
}

function collectFormData() {
    const formData = new FormData(form);
    const payload = {};

    formData.forEach((value, key) => {
        if (key.endsWith("[]")) {
            const cleanKey = key.replace("[]", "");

            if (!payload[cleanKey]) {
                payload[cleanKey] = [];
            }

            payload[cleanKey].push(value);
        } else {
            payload[key] = value;
        }
    });

    payload.spouse_is_beneficiary = spouseBeneficiary ? spouseBeneficiary.checked : false;

    return payload;
}

if (maritalStatus) {
    maritalStatus.addEventListener("change", toggleSpouseFields);
}

if (spouseBeneficiary) {
    spouseBeneficiary.addEventListener("change", toggleBeneficiaryFields);
}

if (form) {
    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (!validateForm()) {
            if (formMessage) {
                formMessage.textContent = "Please complete all required fields.";
                formMessage.classList.add("error");
            }
            return;
        }

        const payload = collectFormData();

        try {
            if (formMessage) {
                formMessage.textContent = "Submitting application...";
                formMessage.className = "eemaa-message";
            }

            const response = await fetch("/api/membership", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Submission failed.");
            }

            if (formMessage) {
                formMessage.textContent = "Application submitted successfully.";
                formMessage.classList.add("success");
            }

            form.reset();
            toggleSpouseFields();
            toggleBeneficiaryFields();
            updateCheckboxCards();

        } catch (error) {
            console.error("Submit error:", error);

            if (formMessage) {
                formMessage.textContent = "Something went wrong. Please try again.";
                formMessage.classList.add("error");
            }
        }
    });
}

bindCheckboxCards();
toggleSpouseFields();
toggleBeneficiaryFields();