# Mécanisme de Retry pour Communication avec Content Script

## Vue d'ensemble

Le code a été refactorisé pour inclure un système générique de retry pour toutes les communications avec le content script. Cela résout les problèmes de timing où le content script n'est pas encore prêt.

## Fonctions disponibles

### 1. `sendMessageToContentScript(action, options)`
**Fonction principale** - Communication générique avec retry automatique

```javascript
sendMessageToContentScript("getUsername", {
  maxRetries: 5,        // Nombre max de tentatives (défaut: 5)
  retryDelay: 500,      // Délai entre tentatives en ms (défaut: 500)
  onRetry: (currentRetry, maxRetries) => {
    console.log(`Tentative ${currentRetry}/${maxRetries}`);
  },
  onSuccess: (response) => {
    console.log("Succès:", response);
  },
  onError: (error) => {
    console.error("Échec:", error);
  }
});
```

### 2. `updateElementFromContentScript(action, elementSelector, options)`
**Fonction utilitaire** - Simplifie la mise à jour d'éléments DOM

```javascript
// Cas simple
updateElementFromContentScript("getUsername", "#username", {
  getValue: (response) => response?.username || "Nom non trouvé"
});

// Cas avec options personnalisées
updateElementFromContentScript("getStats", "#stats", {
  loadingText: "Calcul en cours...",
  errorText: "Stats indisponibles",
  maxRetries: 3,
  getValue: (response) => {
    return `${response?.distance}km - ${response?.time}h`;
  }
});
```

## Exemples d'utilisation

### Exemple 1: Action simple
```javascript
function likeActivity() {
  sendMessageToContentScript("likeActivity", {
    maxRetries: 3,
    onSuccess: (response) => {
      console.log("Activity liked!");
    },
    onError: (error) => {
      alert("Échec du like");
    }
  });
}
```

### Exemple 2: Mise à jour d'élément DOM
```javascript
function getFollowersCount() {
  updateElementFromContentScript("getFollowers", "#followers-count", {
    getValue: (response) => response?.count?.toString() || "0"
  });
}
```

### Exemple 3: Vérification de connexion
```javascript
async function isContentScriptReady() {
  try {
    await sendMessageToContentScript("ping", { maxRetries: 2, retryDelay: 200 });
    return true;
  } catch {
    return false;
  }
}
```

### Exemple 4: Traitement complexe
```javascript
function processUserData() {
  sendMessageToContentScript("getUserData", {
    onRetry: (currentRetry, maxRetries) => {
      document.querySelector("#status").textContent = `Chargement... (${currentRetry}/${maxRetries})`;
    },
    onSuccess: (response) => {
      // Traitement des données
      document.querySelector("#name").textContent = response.name;
      document.querySelector("#email").textContent = response.email;
      document.querySelector("#status").textContent = "Données chargées";
    },
    onError: (error) => {
      document.querySelector("#status").textContent = "Erreur de chargement";
    }
  });
}
```

## Avantages

1. **Robustesse** : Gère automatiquement les cas où le content script n'est pas encore prêt
2. **Réutilisabilité** : Une seule implémentation pour toutes les communications
3. **Flexibilité** : Options personnalisables (nombre de retry, délais, callbacks)
4. **Simplicité** : Fonction utilitaire pour les cas courants de mise à jour DOM
5. **Debugging** : Logs détaillés pour diagnostiquer les problèmes

## Migration du code existant

### Avant (code répétitif et fragile):
```javascript
function getUsername() {
  browser.tabs.query({active: true, currentWindow: true}).then((tabs) => {
    browser.tabs.sendMessage(tabs[0].id, {action: "getUsername"})
      .then(response => {
        document.querySelector("#username").textContent = response.username;
      })
      .catch(error => {
        document.querySelector("#username").textContent = "Erreur";
      });
  });
}
```

### Après (robuste et réutilisable):
```javascript
function getUsername() {
  updateElementFromContentScript("getUsername", "#username", {
    getValue: (response) => response?.username || "Nom non trouvé"
  });
}
```