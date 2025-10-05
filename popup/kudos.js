// Fonction pour vérifier si on est sur Strava
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

// Vérifier immédiatement lors de l'ouverture du popup
checkIfOnStrava();

// Écouter les changements d'onglet
browser.tabs.onActivated.addListener(() => {
  checkIfOnStrava();
});

// Écouter les changements d'URL dans l'onglet actuel
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.active) {
    checkIfOnStrava();
  }
});
const stravaContent = document.querySelector("#strava");
const otherWebsiteContent = document.querySelector("#not-strava");

async function showStravaInterface() {
  const buttonSend = document.querySelector("#send");
  buttonSend.addEventListener("click", async () => {
    buttonSend.disabled = true;
    buttonSend.textContent = "Envoi en cours...";
    await sendMessageToContentScript("giveKudos", {
      onSuccess: (response) => {
        console.log("Réponse après envoi des kudos:", response);
        buttonSend.textContent = "Kudos envoyés !";
        buttonSend.disabled = false;
      },
    });
  });

  stravaContent.style.display = "block";

  if (otherWebsiteContent) {
    otherWebsiteContent.style.display = "none";
  }

  let username = await getUsernameFromContentScript();
  console.log("Nom d'utilisateur récupéré:", username);

  // Appel initial
  getActivitiesFromContentScript(username);

  // Appel toutes les 100ms
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

// Fonction générique pour communiquer avec le content script avec retry
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
      `Tentative ${
        retryCount + 1
      }/${maxRetries} - Erreur lors de la communication (${action}):`,
      error
    );

    if (retryCount < maxRetries) {
      if (onRetry) {
        onRetry(retryCount + 1, maxRetries);
      }

      // Attendre avant de réessayer
      await new Promise((resolve) => setTimeout(resolve, retryDelay));

      // Récursion avec retry count incrémenté
      return sendMessageToContentScript(action, {
        ...options,
        retryCount: retryCount + 1,
      });
    } else {
      // Toutes les tentatives ont échoué
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
      activityCountSpan.textContent = "Chargement...";
    },
    onSuccess: (response) => {
      console.log("Activités reçues:", response);
      console.log("Nombre d'activités:", response?.activities?.length);

      // Log détaillé des activités
      if (response && response.activities && response.activities.length > 0) {
        if (
          !(
            Array.isArray(response.activities) &&
            response.activities.every(
              (activity) =>
                typeof activity === "object" &&
                activity !== null &&
                typeof activity.name === "string" &&
                typeof activity.type === "string"
            )
          )
        ) {
          console.warn("response.activities n'est pas du type attendu");
        } else {
          console.log("Détail des activités:");
          response.activities.forEach((activity, index) => {
            console.log(`Activité ${index + 1}:`, activity);
          });
          let allActivities = response.activities.filter((activity) => {
            console.log("Comparaison des noms:", activity.name, username);
            return activity.name !== username;
          });
          let activitiesWithkudosGiven = allActivities.filter((activity) => {
            return activity.type === "filled_kudos";
          });

          activityCountSpan.textContent =
            activitiesWithkudosGiven.length + " / " + allActivities.length;
        }
      } else {
        activityCountSpan.textContent = "Aucune activité trouvée";
      }
    },
    onError: (error) => {
      activityCountSpan.textContent = "Erreur";
    },
  });
}

function getUsernameFromContentScript() {
  const usernameSpan = document.querySelector("#username");

  return sendMessageToContentScript("getUsername", {
    onRetry: (currentRetry, maxRetries) => {
      usernameSpan.textContent = "Chargement...";
    },
    onSuccess: (response) => {
      if (response && response.username) {
        usernameSpan.textContent = response.username;
      } else {
        usernameSpan.textContent = "Nom d'utilisateur non trouvé";
      }
    },
    onError: (error) => {
      usernameSpan.textContent = "Erreur";
    },
  }) // Retourner le résultat de la promesse
    .then((response) => {
      return response && response.username ? response.username : null;
    })
    .catch((error) => {
      console.error(
        "Erreur lors de la récupération du nom d'utilisateur:",
        error
      );
      return null;
    });
}
