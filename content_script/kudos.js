// Amélioration future : ne donner des kudos que si la personne a été sélectionnée dans une liste

// Dans l'interface :
//      Propositions : tout le monde / tout le monde sauf / uniquemenent ces personnes / personne
//      Donner des kudos : Au chargement de la page / En appuyant sur le bouton
//      Nombre d'activités à charger : (int) /!\ Peut ralentir le chargement de la page

// Fonction pour donner des kudos (code existant)
boutons = document.querySelectorAll('[title="Envoyer des kudos"]');

function giveKudos(boutons, i = 0) {
  // Il faut mettre un timeout sinon on se fait bloquer par l'api pour trop nombreuses requêtes
  if (i < boutons.length) {
    setTimeout(function () {
      giveKudos(boutons, i + 1);
    }, 500);
    boutons[i].click();
  }
}

// Nouvelle fonction pour colorer les liens en vert
function colorLinksGreen() {
  const links = document.querySelectorAll("a");
  console.log(`Trouvé ${links.length} liens à colorer`);

  links.forEach((link) => {
    link.style.color = "green";
    link.style.fontWeight = "bold";
  });
}

// Écouter les messages du popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message reçu dans le content script:", message);

  if (message.action === "colorLinksGreen") {
    colorLinksGreen();
    sendResponse({ success: true });
  }
});
