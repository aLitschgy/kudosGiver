// Function to check if we are on Strava
function checkIfOnStrava() {
  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    const currentUrl = tabs[0].url;
    const isOnStrava = currentUrl.includes("strava.com/dashboard");

    if (isOnStrava) {
      showStravaInterface();
    } else {
      showNonStravaInterface();
    }
  });
}

// Check immediately when opening the popup
checkIfOnStrava();

// Listen to tab changes
browser.tabs.onActivated.addListener(() => {
  checkIfOnStrava();
});

// Listen to URL changes in the current tab
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.active) {
    checkIfOnStrava();
  }
});
const stravaContent = document.querySelector("#strava");
const otherWebsiteContent = document.querySelector("#not-strava");

async function showStravaInterface() {
  const buttonSend = document.querySelector("#send");
  const autoKudosToggle = document.querySelector("#auto-kudos-toggle");

  // Load toggle state from storage
  const storageData = await browser.storage.local.get("kudoGiverAutoGive");
  const isAutoKudosEnabled = storageData.kudoGiverAutoGive || false;
  autoKudosToggle.checked = isAutoKudosEnabled;

  // Listen to toggle changes
  autoKudosToggle.addEventListener("change", async () => {
    const newValue = autoKudosToggle.checked;
    await browser.storage.local.set({ kudoGiverAutoGive: newValue });
    console.log("Auto kudos:", newValue ? "enabled" : "disabled");
    
    // Notify content script to check and auto-give kudos if enabled
    await sendMessageToContentScript("toggleAutoKudos", {
      onSuccess: (response) => {
        console.log("Auto-kudos toggled:", response);
      },
    });
  });

  buttonSend.addEventListener("click", async () => {
    buttonSend.disabled = true;
    buttonSend.textContent = "Sending...";
    await sendMessageToContentScript("giveKudos", {
      onSuccess: (response) => {
        console.log("Response after sending kudos:", response);
        buttonSend.textContent = "Kudos sent!";
        buttonSend.disabled = false;
      },
    });
  });

  stravaContent.style.display = "block";

  if (otherWebsiteContent) {
    otherWebsiteContent.style.display = "none";
  }

  let username = await getUsernameFromContentScript();
  console.log("Username retrieved:", username);

  // Initial call
  getActivitiesFromContentScript(username);

  // Call every 100ms
  setInterval(() => {
    getActivitiesFromContentScript(username);
  }, 100);
}

function showNonStravaInterface() {
  if (stravaContent) {
    stravaContent.style.display = "none";
  }

  if (otherWebsiteContent) {
    otherWebsiteContent.style.display = "block";
  }

  let goToStravaLink = document.querySelector("#strava-link");

  if (goToStravaLink) {
    goToStravaLink.addEventListener("click", (e) => {
      e.preventDefault();
      browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        browser.tabs.update(tabs[0].id, {
          url: "https://www.strava.com/dashboard",
        });
      });
    });
  }
}

// Generic function to communicate with the content script with retry
async function sendMessageToContentScript(action, options = {}) {
  const {
    maxRetries = 50,
    retryDelay = 500,
    onRetry = null,
    onSuccess = null,
    onError = null,
    retryCount = 0,
  } = options;

  try {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    const response = await browser.tabs.sendMessage(tabs[0].id, { action });

    if (response && onSuccess) {
      onSuccess(response);
    }
    return response;
  } catch (error) {
    console.log(
      `Attempt ${
        retryCount + 1
      }/${maxRetries} - Communication error (${action}):`,
      error,
    );

    if (retryCount < maxRetries) {
      if (onRetry) {
        onRetry(retryCount + 1, maxRetries);
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, retryDelay));

      // Recursion with incremented retry count
      return sendMessageToContentScript(action, {
        ...options,
        retryCount: retryCount + 1,
      });
    } else {
      // All attempts failed
      if (onError) {
        onError(error);
      }
      throw error;
    }
  }
}

function getActivitiesFromContentScript(username) {
  const activityCountSpan = document.querySelector("#activity-count");
  sendMessageToContentScript("getActivities", {
    onRetry: (currentRetry, maxRetries) => {
      activityCountSpan.textContent = "Loading...";
    },
    onSuccess: (response) => {
      console.log("Activities received:", response);
      console.log("Number of activities:", response?.activities?.length);

      // Detailed activity log
      if (response && response.activities && response.activities.length > 0) {
        if (
          !(
            Array.isArray(response.activities) &&
            response.activities.every(
              (activity) =>
                typeof activity === "object" &&
                activity !== null &&
                typeof activity.name === "string" &&
                typeof activity.type === "string",
            )
          )
        ) {
          console.warn("response.activities is not of the expected type");
        } else {
          console.log("Activity details:");
          response.activities.forEach((activity, index) => {
            console.log(`Activity ${index + 1}:`, activity);
          });
          let allActivities = response.activities.filter((activity) => {
            console.log("Name comparison:", activity.name, username);
            return activity.name !== username;
          });
          let activitiesWithkudosGiven = allActivities.filter((activity) => {
            return activity.type === "filled_kudos";
          });

          activityCountSpan.textContent =
            activitiesWithkudosGiven.length + " / " + allActivities.length;
        }
      } else {
        activityCountSpan.textContent = "No activities found";
      }
    },
    onError: (error) => {
      activityCountSpan.textContent = "Error";
    },
  });
}

function getUsernameFromContentScript() {
  const usernameSpan = document.querySelector("#username");

  return sendMessageToContentScript("getUsername", {
    onRetry: (currentRetry, maxRetries) => {
      usernameSpan.textContent = "Loading...";
    },
    onSuccess: (response) => {
      if (response && response.username) {
        usernameSpan.textContent = response.username;
      } else {
        usernameSpan.textContent = "Username not found";
      }
    },
    onError: (error) => {
      usernameSpan.textContent = "Error";
    },
  }) // Retourner le résultat de la promesse
    .then((response) => {
      return response && response.username ? response.username : null;
    })
    .catch((error) => {
      console.error("Error retrieving username:", error);
      return null;
    });
}
