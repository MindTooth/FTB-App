import router from '@/router';
import store from '@/modules/store';
import {consoleBadButNoLogger, emitter, getLogger, logVerbose} from '@/utils';
import Vue from 'vue';
import ElectronOverwolfInterface from './electron-overwolf-interface';
import os from 'os';
import {handleAction} from '@/core/protocol/protocolActions';
import {AuthenticationCredentialsPayload} from '@/core/@types/authentication.types';

declare global {
  var overwolf: any;
}

const versionData = overwolf.windows.getMainWindow().getVersionData();

const logger = getLogger('overwolf-bridge');

const getWindowState = (windowId: any) => {
  return new Promise((resolve, reject) => {
    //@ts-ignore
    overwolf.windows.getWindowState(windowId, (res) => {
      if (res && res.status === 'success') {
        resolve(res.window_state_ex);
      } else {
        reject(res);
      }
    });
  });
};

const Overwolf: ElectronOverwolfInterface = {
  config: {
    publicVersion: versionData.publicVersion ?? 'Missing version file',
    appVersion: versionData.jarVersion ?? 'Missing Version File',
    webVersion: versionData.webVersion ?? 'Missing Version File',
    dateCompiled: versionData.timestampBuilt ?? 'Missing Version File',
    javaLicenses: versionData.javaLicense ?? {},
    branch: versionData.branch ?? 'Release'
  },

  // Tools
  utils: {
    openUrl(url: string) {
      overwolf.utils.openUrlInDefaultBrowser(url);
    },

    getOsArch() {
      return os.arch();
    },

    async getPlatformVersion() {
      return new Promise((resolve) => {
        overwolf.extensions.current.getManifest((app: any) => resolve(app.meta.version));
      });
    },
    
    crypto: {
      randomUUID(): string {
        return overwolf.windows.getMainWindow().randomUUID() as string;
      }
    },

    openDevTools() {
      // No way to do this on overwolf atm
    }
  },

  // Actions
  actions: {
    openMsAuth() {
      overwolf.utils.openUrlInDefaultBrowser(`https://msauth.feed-the-beast.com?useNew=true`);
    },

    emitAuthenticationUpdate(credentials?: AuthenticationCredentialsPayload) {
      emitter.emit("authentication.callback", credentials)
    },

    closeWebservers() {
      // Should likely do something but right now it's not as important
    },

    openModpack(payload) {
      overwolf.utils.openUrlInDefaultBrowser(`ftb://modpack/${payload.id}`);
    },

    openFriends() {
      overwolf.windows.obtainDeclaredWindow('chat', (result: any) => {
        if (result.success && !result.window.isVisible) {
          overwolf.windows.restore(result.window.id);
        }
      });
    },

    async openLogin(cb: (data: any) => void) {
      await overwolf.windows.getMainWindow().openWebserver(cb);
      overwolf.utils.openUrlInDefaultBrowser(`https://minetogether.io/api/login?redirect=http://localhost:7755`);
    },

    changeExitOverwolfSetting(value: boolean) {
      overwolf.settings.setExtensionSettings({ exit_overwolf_on_exit: value }, (data: any) => {});
    },

    logoutFromMinetogether() {
      overwolf.windows.obtainDeclaredWindow('chat', (result: any) => {
        if (result.success && result.window.isVisible) {
          overwolf.windows.close(result.window.id);
        }
      });
    },

    setUser(payload) {
      overwolf.windows.getMainWindow().setAuthData(payload);
    },

    uploadClientLogs() {
      overwolf.utils.uploadClientLogs((result: any) => {
      });
    },
    
    yeetLauncher(windowId, cb) {
      // TODO: (legacy) if exitOverwolf is enabled, ensure Overwolf exists
      overwolf.windows.close(windowId);
      //@ts-ignore
      if (window.isChat === undefined || window.isChat === false) {
        cb();
        //@ts-ignore
        // overwolf.windows.getMainWindow().closeEverythingAndLeave();
      }
    },

    // Nothing done for reasons
    onAppReady() {},
    updateSettings() {},
    sendSession() {},
    
    restartApp() {
      overwolf.windows.getMainWindow().restartApp();
    }
  },

  // Clipboard
  cb: {
    copy(e: string) {
      overwolf.utils.placeOnClipboard(e);
    },
    paste(): string {
      let str = '';

      overwolf.utils.getFromClipboard((clipboard: string) => {
        str = clipboard;
      });

      return str ?? '';
    },
  },

  // Frame / Chrome / Window / What ever you want to call it
  frame: {
    close(windowId: any, onClose: () => void) {
      // TODO: (legacy) if exitOverwolf is enabled, ensure Overwolf exists
      overwolf.windows.close(windowId);

      // @ts-ignore we don't know what the window is.
      if (window.isChat === undefined || window.isChat === false) {
        onClose();
      }
    },
    min(windowId: any) {
      overwolf.windows.minimize(windowId);
    },
    async max(windowId: any) {
      let maximised = await getWindowState(windowId);
      if (maximised === 'maximized') {
        overwolf.windows.restore(windowId);
      } else {
        overwolf.windows.maximize(windowId);
      }
    },
    // we don't need this on electron because it's not silly
    handleDrag(event: any, windowId: any) {
      if (event.target.classList.contains('title-action')) {
        return;
      }

      overwolf.windows.dragMove(windowId);
    },
    setupTitleBar(cb: (windowId: any) => void) {
      overwolf.windows.getCurrentWindow((result: any) => {
        if (result && result.status === 'success' && result.window && result.window.id) {
          cb(result.window.id);
        }
      });
    },
    expandWindow() {
      overwolf.windows.getCurrentWindow((result: any) => {
        if (result && result.status === 'success' && result.window && result.window.id) {
          //@ts-ignore
          overwolf.windows.changeSize(result.window.id, 800, result.window.height);
        }
      });
    },
    collapseWindow() {
      overwolf.windows.getCurrentWindow((result: any) => {
        if (result && result.status === 'success' && result.window && result.window.id) {
          //@ts-ignore
          overwolf.windows.changeSize(result.window.id, 300, result.window.height);
        }
      });
    },
    quit() {
      overwolf.windows.getCurrentWindow((result: any) => {
        if (result.success) {
          //@ts-ignore
          overwolf.windows.close(result.window.id);
        }
      });
    },
    setSystemWindowStyle(enabled) {}
  },

  // IO
  io: {
    selectFolderDialog(startPath, cb) {
      overwolf.utils.openFolderPicker(startPath, (resp: any) => {
        if (resp && resp.status === 'success') {
          cb(resp.path);
        }
      });
    },

    selectFileDialog(cb) {
      overwolf.utils.openFilePicker('', (resp: any) => {
        if (resp && resp.status === 'success') {
          cb(resp.file);
        }
      });
    },
    
    openFinder(path: string): Promise<boolean> {
      return new Promise((resolve) => {
        overwolf.utils.openWindowsExplorer(path, (result: any) => {
          resolve(result.status === 'success');
        });
      });
    },
    
    getLocalAppData() {
      return overwolf.io.paths.localAppData;
    }
  },

  // Websockets
  websocket: {
    // Empty shim (this doesn't happen on overwolf)
    notifyWebhookReceived(message: string) {},
  },

  setupApp(vm) {
    // setup websockets and the actual window
    let mainWindow = overwolf.windows.getMainWindow();    
    let initialData = mainWindow.getWebsocketData();
    logger.info('Initial WS data: ', initialData);
    let ws: WebSocket;
    let reconnectCount = 0;
    
    new Promise(resolve => {
      overwolf.utils.getMonitorsList(async (result: any) => {
        // Get the window scaling
        const scale = window.devicePixelRatio;

        // Work out the smallest monitor and use that as the max height we can work within
        if (!result.displays) {
          consoleBadButNoLogger("D", "No displays found")
          return;
        }

        let maxHeight = Infinity;
        result.displays.forEach((display: any) => {
          const windowHeight = Math.floor(display.height / scale);
          maxHeight = Math.min(maxHeight, windowHeight);
        });

        consoleBadButNoLogger("D", "Max height: ", maxHeight)
        
        resolve(maxHeight)
      });
    }).then(async (height: any) => {
      const manifestData: any = await new Promise(resolve => overwolf.extensions.current.getManifest((manifest: any) => resolve(manifest)));
      const indexWindow = manifestData.data.windows.index;

      if (height < 880) {
        overwolf.windows.setMinSize("index", indexWindow.min_size.width, 700, (e: any) => consoleBadButNoLogger("D", e));
        if (!(window as any).ftbFlags) {
          (window as any).ftbFlags = {};
        }

        (window as any).ftbFlags.smallMonitor = true;
      }
    })
    
    async function onConnect() {
      logger.info('Auth data:', mainWindow.getAuthData());
      //@ts-ignore
      if (mainWindow.getAuthData() !== undefined) {
        //@ts-ignore
        let data = overwolf.windows.getMainWindow().getAuthData();
        if (data.token) {
          store.dispatch('auth/setSessionID', data.token, { root: true });
        }
        //@ts-ignore
        if (data['app-auth'] && !window.isChat) {
          const settings = store.state.settings?.settings;
          if (settings !== undefined) {
            if (settings.sessionString !== data['app-auth']) {
              settings.sessionString = data['app-auth'];
              store.dispatch('settings/saveSettings', settings, { root: true });
            }
          }
        }
      } else {
        await store.dispatch('settings/loadSettings');
        const settings = store.state.settings?.settings;
        if (settings !== undefined) {
          if (settings.sessionString !== undefined && settings.sessionString.length > 0) {
            store.dispatch('auth/getNewSession', settings.sessionString, { root: true });
          }
        }
      }

      //@ts-ignore
      let launchedProtoURL = overwolf.windows.getMainWindow().getProtocolURL();
      if (launchedProtoURL !== undefined) {
        parseAndHandleURL(launchedProtoURL);
        launchedProtoURL = undefined;
      }
    }

    function setupWS(port: Number = 13377) {
      ws = new WebSocket('ws://localhost:' + port);
      Vue.prototype.$socket = ws;
      ws.addEventListener('message', (event) => {
        let content = JSON.parse(event.data);
        if (!(content?.type && content?.type !== '' && content?.type.startsWith('profiles.'))) {
          logVerbose(store.state, event.data);
        } else {
          logVerbose(store.state, 'Rejecting logging of profile data');
        }
        if (content.port && content.secret) {
          ws.close(4000, 'newport');
          store.commit('STORE_WS', content);
          mainWindow.setWSData(content);
          setupWS(content.port);
        } else {
          store.commit('SOCKET_ONMESSAGE', content);
        }
      });
      ws.addEventListener('open', (event) => {
        consoleBadButNoLogger("I", 'Connected to socket!', mainWindow.getWebsocketData());
        if (mainWindow.getWebsocketData().dev || mainWindow.getWebsocketData().secret !== undefined) {
          consoleBadButNoLogger("I", 'Socket opened correctly and ready!');
          setTimeout(() => {
            store.commit('SOCKET_ONOPEN');
            onConnect();
          }, 200);
        }
        reconnectCount = 0;
      });
      ws.addEventListener('error', (err) => {
        consoleBadButNoLogger("E", 'Error!', err);
        store.commit('SOCKET_ONERROR', err);
      });
      ws.addEventListener('close', (event) => {
        if (event.target !== ws) {
          return;
        }
        consoleBadButNoLogger("I", 'Disconnected!', event, event.code, event.reason);
        if (event.reason !== 'newport' || (port === 13377 && mainWindow.getWebsocketData().secret !== undefined)) {
          consoleBadButNoLogger("I",'Retrying connection');
          setTimeout(() => setupWS(port), 1000);
          reconnectCount++;
          setTimeout(() => store.commit('SOCKET_RECONNECT', reconnectCount), 200);
        }
        setTimeout(() => store.commit('SOCKET_ONCLOSE', event), 200);
      });
    }

    function parseAndHandleURL(protocolURL: string) {
      handleAction(protocolURL);
      // protocolURL = protocolURL.substring(6, protocolURL.length);
      // const parts = protocolURL.split('/');
      // const command = parts[0];
      // const args = parts.slice(1, parts.length);
      // if (command === 'modpack') {
      //   if (args.length === 0) {
      //     return;
      //   }
      //   logVerbose(store.state, 'Received modpack protocol message', args);
      //   const modpackID = args[0];
      //   if (args.length === 1) {
      //     // Navigate to page for modpack
      //     logVerbose(store.state, 'Navigating to page for modpack', modpackID);
      //     router.push({ name: 'modpackpage', query: { modpackid: modpackID } });
      //   } else if (args.length === 2) {
      //     if (args[1] === 'install') {
      //       // Popup install for modpack
      //       logVerbose(store.state, 'Popping up install for modpack', modpackID);
      //       router.push({ name: 'modpackpage', query: { modpackid: modpackID, showInstall: 'true' } });
      //     }
      //   } else if (args.length === 3) {
      //     if (args[2] === 'install') {
      //       // Popup install for modpack with version default selected
      //       router.push({
      //         name: 'modpackpage',
      //         query: { modpackid: modpackID, showInstall: 'true', version: args[1] },
      //       });
      //     }
      //   }
      // } else if (command === 'instance') {
      //   if (args.length === 0) {
      //     return;
      //   }
      //   const instanceID = args[0];
      //   if (args.length === 1) {
      //     // Open instance page
      //     router.push({ name: 'instancepage', query: { uuid: instanceID } });
      //   } else if (args.length === 2) {
      //     // Start instance
      //     router.push({ name: 'instancepage', query: { uuid: instanceID, shouldPlay: 'true' } });
      //   }
      // } else if (command === 'server') {
      //   if (args.length === 0) {
      //     return;
      //   }
      //   const serverID = args[0];
      //   router.push({ name: 'server', query: { serverid: serverID } });
      // }
    }

    handleWSInfo(initialData.port, true, initialData.secret, initialData.dev);

    function handleWSInfo(port: Number, isFirstConnect: Boolean = false, secret?: String, dev?: Boolean) {
      consoleBadButNoLogger("I", 'Handling WS INFO', port, secret, dev);
      setupWS(port);
      if (secret && !dev) {
        store.commit('STORE_WS', initialData);
      }
    }

    mainWindow.setNewWebsocketCallback(handleWSInfo);
    //@ts-ignore
    if (window.isChat === undefined || !window.isChat) {
      //@ts-ignore
      overwolf.extensions.onAppLaunchTriggered.addListener(function (event) {
        if (event.origin === 'urlscheme') {
          let protocolURL = event.parameter;
          if (protocolURL === undefined) {
            return;
          }
          protocolURL = decodeURIComponent(protocolURL);
          parseAndHandleURL(protocolURL);
        }
      });

      addWindowListener().catch(logger.error);
    }

    async function addWindowListener() {
      let ourWindowID = await new Promise((resolve) => {
        overwolf.windows.getCurrentWindow((e: any) => {
          if (e.success) {
            resolve(e.window.id);
          }
        });
      });

      overwolf.windows.onStateChanged.addListener((event: any) => {
        const windowAd: any = (window as any).ads;
        if (!windowAd) {
          logger.warn("Unable to control ad as it's not set");
          return;
        }
        
        if (event.window_id === ourWindowID) {
          if (
            event.window_previous_state_ex === 'minimized' &&
            (event.window_state_ex === 'normal' || event.window_state_ex === 'maximized')
          ) {
            if (windowAd) {
              Object.values(windowAd.ads ?? {}).forEach((e: any) => e.refreshAd());
              logger.info('Refreshing owAd');
            }
          } else if (
            event.window_state_ex === 'minimized' &&
            (event.window_previous_state_ex === 'normal' || event.window_previous_state_ex === 'maximized')
          ) {
            if (windowAd) {
              Object.values(windowAd.ads ?? {}).forEach((e: any) => e.removeAd());
              logger.info('removing owAd');
            }
          }
        }
      });
    }

    //@ts-ignore
    if (window.isChat) {
      router.push('/chat');
      //@ts-ignore
      overwolf.windows.getMainWindow().addCallback((data: any) => {
        if (data.token) {
          store.dispatch('auth/setSessionID', data.token, { root: true });
        }
      });
    }
  },
};

export default Overwolf;
