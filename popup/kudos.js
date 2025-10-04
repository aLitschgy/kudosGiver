// Fonction pour vérifier si on est sur Strava
function checkIfOnStrava() {
  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    const currentUrl = tabs[0].url;
    const isOnStrava = currentUrl.includes("strava.com");

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

function showStravaInterface() {
  const buttonSend = document.querySelector("#send");

  stravaContent.style.display = "block";

  if (otherWebsiteContent) {
    otherWebsiteContent.style.display = "none";
  }

  getActivitiesFromContentScript();

  updateElementFromContentScript("getUsername", "#username", {
    loadingText: "Chargement...",
    errorText: "Erreur",
    getValue: (response) => response?.username || "Inconnu",
  });
}

// Exemples d'autres fonctions utilisant le mécanisme générique
function sendKudosToAll() {
  sendMessageToContentScript("sendKudos", {
    maxRetries: 3, // Moins de tentatives pour les actions
    onRetry: (currentRetry, maxRetries) => {
      console.log(`Tentative d'envoi de kudos ${currentRetry}/${maxRetries}`);
    },
    onSuccess: (response) => {
      console.log("Kudos envoyés avec succès:", response);
      // Mettre à jour l'interface si nécessaire
    },
    onError: (error) => {
      console.error("Échec de l'envoi des kudos:", error);
    },
  });
}

function getProfileInfo() {
  sendMessageToContentScript("getProfile", {
    onRetry: (currentRetry, maxRetries) => {
      console.log(
        `Récupération du profil - tentative ${currentRetry}/${maxRetries}`
      );
    },
    onSuccess: (response) => {
      if (response && response.profile) {
        console.log("Profil récupéré:", response.profile);
        // Traiter les données du profil
      }
    },
    onError: (error) => {
      console.error("Erreur lors de la récupération du profil:", error);
    },
  });
}

function checkConnectionStatus() {
  return sendMessageToContentScript("ping", {
    maxRetries: 2,
    retryDelay: 200,
    onSuccess: (response) => {
      console.log("Content script connecté");
      return true;
    },
    onError: (error) => {
      console.log("Content script non disponible");
      return false;
    },
  });
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
        browser.tabs.update(tabs[0].id, { url: "https://www.strava.com" });
      });
    });
  }
}

// Fonction générique pour communiquer avec le content script avec retry
async function sendMessageToContentScript(action, options = {}) {
  const {
    maxRetries = 5,
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

// Fonction utilitaire simplifiée pour les cas courants
function updateElementFromContentScript(action, elementSelector, options = {}) {
  const element = document.querySelector(elementSelector);
  if (!element) {
    console.error(`Élément ${elementSelector} non trouvé`);
    return;
  }

  const {
    loadingText = "Chargement...",
    errorText = "Erreur",
    getValue = (response) => response,
    ...restOptions
  } = options;

  sendMessageToContentScript(action, {
    ...restOptions,
    onRetry: (currentRetry, maxRetries) => {
      element.textContent = loadingText;
    },
    onSuccess: (response) => {
      try {
        const value = getValue(response);
        element.textContent = value || "Aucune donnée";
      } catch (error) {
        console.error("Erreur lors du traitement de la réponse:", error);
        element.textContent = errorText;
      }
    },
    onError: (error) => {
      element.textContent = errorText;
    },
  });
}

function getActivitiesFromContentScript() {
  const activityCountSpan = document.querySelector("#activity-count");
  sendMessageToContentScript("getActivities", {
    onRetry: (currentRetry, maxRetries) => {
      activityCountSpan.textContent = "Chargement...";
    },
    onSuccess: (response) => {
      if (response && response.activities) {
        activityCountSpan.textContent = response.activities.length;
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

  sendMessageToContentScript("getUsername", {
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
  });
}
