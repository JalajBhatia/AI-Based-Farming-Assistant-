console.log("✅ Disease JS Loaded");

const input = document.getElementById("imageInput");
const preview = document.getElementById("previewImage");
const uploadText = document.getElementById("uploadText");

input.addEventListener("change", () => {
    const file = input.files[0];
    if (file) {
        preview.src = URL.createObjectURL(file);
        preview.classList.remove("hidden");
        uploadText.innerText = "✅ Image selected";
    }
});

function formatDisease(name) {
    return name.replace(/___/g, " - ").replace(/_/g, " ");
}

document.getElementById("predictBtn").addEventListener("click", () => {

    if (!input.files.length) {
        alert("Select image first");
        return;
    }

    const formData = new FormData();
    formData.append("image", input.files[0]);

    fetch("http://127.0.0.1:5000/api/disease/predict", {
        method: "POST",
        body: formData
    })
    .then(res => res.json())
    .then(data => {

        if (data.success) {

            document.getElementById("resultBox").classList.remove("hidden");

            const percent = (data.confidence * 100).toFixed(2);

            document.getElementById("diseaseName").innerText =
                "🌿 " + formatDisease(data.disease_name);

            document.getElementById("confidenceText").innerText =
                "Confidence: " + percent + "%";

            document.getElementById("confidenceBar").style.width =
                percent + "%";

            // TIPS
            document.getElementById("tipsBox").classList.remove("hidden");

            document.getElementById("treatmentText").innerText =
                data.treatment ||
                "Apply fungicide, remove infected leaves, and monitor crop.";

            document.getElementById("preventionText").innerText =
                data.prevention ||
                "Maintain spacing, avoid excess water, use healthy seeds.";

        } else {
            alert(data.error);
        }
    })
    .catch(err => {
        console.error(err);
        alert("Server error");
    });
});