const buttonSend = document.querySelector("#send");
const buttonRefresh = document.querySelector("#refresh");

const activityCountSpan = document.querySelector("#activity-count");

buttonRefresh.addEventListener("click", () => {
  getActivitiesFromContentScript();
  activityCountSpan.textContent = "Chargement...";
});

function getActivitiesFromContentScript() {
  let activityCount = 0;
  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    browser.tabs
      .sendMessage(tabs[0].id, { action: "getActivities" })
      .then((response) => {
        activityCount = response.activities;
        console.log("activités : ", activityCount);
        activityCountSpan.textContent = activityCount.length;
      });
  });
}
