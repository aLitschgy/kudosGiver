// Amélioration future : ne donner des kudos que si la personne a été sélectionnée dans une liste

// Dans l'interface :
//      Propositions : tout le monde / tout le monde sauf / uniquemenent ces personnes / personne
//      Donner des kudos : Au chargement de la page / En appuyant sur le bouton
//      Nombre d'activités à charger : (int) /!\ Peut ralentir le chargement de la page

// Fonction pour récupérer le nom d'utilisateur
function getUsername() {
  const usernameElement = document.querySelector(".athlete-name");
  return usernameElement ? usernameElement.textContent.trim() : "";
}

function getActivities() {
  const activities = Array.from(
    document.querySelectorAll('[data-testid="web-feed-entry"]')
  );
  return activities;
}

// Écouter les messages du popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getActivities") {
    const activities = getActivities()
      .map((entry) => {
        // Récupérer le nom de la personne
        const nameElement = entry.querySelector('[data-testid="owners-name"]');
        const name = nameElement ? nameElement.textContent.trim() : null;

        // Déterminer le type de kudos (filled ou unfilled)
        // Chercher d'abord dans le SVG à l'intérieur du bouton kudos
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
    const activities = getActivities();
    const username = getUsername();

    activities.forEach((entry, index) => {
      // Récupérer le nom de la personne
      const nameElement = entry.querySelector('[data-testid="owners-name"]');
      const ownerName = nameElement ? nameElement.textContent.trim() : null;

      // Vérifier si le nom est différent du username
      if (ownerName && ownerName !== username) {
        const kudosButton = entry.querySelector('[data-testid="kudos_button"]');

        if (kudosButton) {
          // Vérifier si le SVG unfilled_kudos est présent (pas encore de kudos donné)
          const unfilledKudos = kudosButton.querySelector(
            '[data-testid="unfilled_kudos"]'
          );

          if (unfilledKudos) {
            // Cliquer sur le bouton avec un délai pour éviter le spam
            setTimeout(() => {
              kudosButton.click();
              console.log(`Kudos donné à ${ownerName}`);
            }, index * 500); // 500ms de délai entre chaque clic
          }
        }
      }
    });

    sendResponse({
      success: true,
    });
  }
});
