// Future improvement: only give kudos if the person has been selected in a list

// In the interface:
//      Options: everyone / everyone except / only these people / nobody
//      Give kudos: On page load / By clicking the button
//      Number of activities to load: (int) /!\ May slow down page loading

const APIsendDelay = 2000; // Delay between each kudos send in ms
let isGivingKudos = false; // Flag to avoid simultaneous executions

// Function to get the username
function getUsername() {
  const usernameElement = document.querySelector(".athlete-name");
  return usernameElement ? usernameElement.textContent.trim() : "";
}

function getActivities() {
  const activities = Array.from(
    document.querySelectorAll('[data-testid="web-feed-entry"]'),
  );
  return activities;
}

// Function to automatically give kudos
async function giveKudosToActivities() {
  if (isGivingKudos) {
    console.log("Kudos already being sent, operation ignored");
    return { success: false, message: "Already in progress" };
  }

  isGivingKudos = true;
  const activities = getActivities();
  const username = getUsername();
  let kudosToGive = 0;

  activities.forEach((entry, index) => {
    // Get the person's name
    const nameElement = entry.querySelector('[data-testid="owners-name"]');
    const ownerName = nameElement ? nameElement.textContent.trim() : null;

    // Check if the name is different from the username
    if (ownerName && ownerName !== username) {
      const kudosButton = entry.querySelector('[data-testid="kudos_button"]');

      if (kudosButton) {
        // Check if the unfilled_kudos SVG is present (no kudos given yet)
        const unfilledKudos = kudosButton.querySelector(
          '[data-testid="unfilled_kudos"]',
        );

        if (unfilledKudos) {
          // Click the button with a delay to avoid spam
          setTimeout(() => {
            kudosButton.click();
            console.log(`Kudos given to ${ownerName}`);
          }, kudosToGive * APIsendDelay);
          kudosToGive += 1;
        }
      }
    }
  });

  // Reset the flag after all kudos have been given
  setTimeout(() => {
    isGivingKudos = false;
    console.log(`${kudosToGive} kudos have been given`);
  }, kudosToGive * APIsendDelay);

  return { success: true, count: kudosToGive };
}

// Check if there are activities without kudos
function hasUnfilledKudos() {
  const activities = getActivities();
  const username = getUsername();

  return activities.some((entry) => {
    const nameElement = entry.querySelector('[data-testid="owners-name"]');
    const ownerName = nameElement ? nameElement.textContent.trim() : null;

    if (ownerName && ownerName !== username) {
      const kudosButton = entry.querySelector('[data-testid="kudos_button"]');
      if (kudosButton) {
        const unfilledKudos = kudosButton.querySelector(
          '[data-testid="unfilled_kudos"]',
        );
        return unfilledKudos !== null;
      }
    }
    return false;
  });
}

// Check and auto-give kudos if enabled
async function checkAndAutoGiveKudos() {
  // Check if auto-kudos is enabled in storage
  const storageData = await browser.storage.local.get("kudoGiverAutoGive");
  const isAutoKudosEnabled = storageData.kudoGiverAutoGive || false;

  if (isAutoKudosEnabled && !isGivingKudos && hasUnfilledKudos()) {
    console.log("Auto-kudos enabled: starting automatically...");
    await giveKudosToActivities();
  } else {
    console.log(
      `Auto-kudos ${isAutoKudosEnabled ? "enabled" : "disabled"}, ${
        isGivingKudos ? "sending in progress" : "ready to send"
      }, ${hasUnfilledKudos() ? "kudos to give" : "no kudos to give"}`,
    );
  }
}

// Listen to messages from the popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getActivities") {
    const activities = getActivities()
      .map((entry) => {
        // Get the person's name
        const nameElement = entry.querySelector('[data-testid="owners-name"]');
        const name = nameElement ? nameElement.textContent.trim() : null;

        // Determine the kudos type (filled or unfilled)
        // First look in the SVG inside the kudos button
        const kudosButton = entry.querySelector('[data-testid="kudos_button"]');
        const unfilledKudos = kudosButton
          ? kudosButton.querySelector('[data-testid="unfilled_kudos"]')
          : null;
        const filledKudos = kudosButton
          ? kudosButton.querySelector('[data-testid="filled_kudos"]')
          : null;

        let type;
        if (unfilledKudos) {
          type = "unfilled_kudos";
        } else if (filledKudos) {
          type = "filled_kudos";
        } else {
          type = null;
        }
        if (name && type) {
          return { name, type };
        }
      })
      .filter((activity) => activity !== undefined);
    sendResponse({ activities });
  }

  if (message.action === "getUsername") {
    const username = getUsername();
    sendResponse({ username });
  }

  if (message.action === "giveKudos") {
    //TODO : add a list of selected people as parameter
    giveKudosToActivities().then((result) => {
      sendResponse(result);
    });

    // Indicate asynchronous response
    return true;
  }

  if (message.action === "toggleAutoKudos") {
    // Check and auto-give kudos when toggle is changed from popup
    checkAndAutoGiveKudos().then(() => {
      sendResponse({ success: true, message: "Auto-kudos check triggered" });
    });

    // Indicate asynchronous response
    return true;
  }
});

// Observer to detect new activities
const observer = new MutationObserver((mutations) => {
  // Check if new activities have been added
  const hasNewActivities = mutations.some((mutation) => {
    return Array.from(mutation.addedNodes).some((node) => {
      return (
        node.nodeType === 1 &&
        (node.matches('[data-testid="web-feed-entry"]') ||
          node.querySelector('[data-testid="web-feed-entry"]'))
      );
    });
  });

  if (hasNewActivities) {
    console.log("New activities detected");
    checkAndAutoGiveKudos();
  }
});

// Observe the activity container
function startObserving() {
  const feedContainer =
    document.querySelector('[class*="feed-container"]') || document.body;

  if (feedContainer) {
    observer.observe(feedContainer, {
      childList: true,
      subtree: true,
    });
    console.log("Observer started for new activities");

    // Initial check on load
    checkAndAutoGiveKudos();
  }
}

// Start observing once the page is loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startObserving);
} else {
  startObserving();
}
