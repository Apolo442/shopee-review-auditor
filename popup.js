document.addEventListener("DOMContentLoaded", function () {
  const portfolioBtn = document.getElementById("portfolioBtn");

  portfolioBtn.addEventListener("click", function () {
    chrome.tabs.create({ url: "https://mateussampaiodev.vercel.app/" });
  });
});
