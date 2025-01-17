<template>
  <div class="pack-loading" :class="{ 'dark-mode': darkMode }">
    <header class="flex">
      <img v-if="artLogo" :src="artLogo" class="art rounded-2xl shadow mr-8" width="135" alt="" />

      <div class="body flex-1">
        <h3 class="text-xl font-bold mb-2">
          {{ launchStatus.replace('%s', instanceName) }}
        </h3>
        <p v-if="finishedLoading && !hasCrashed">
          {{ instanceName }} should be running! Enjoy <font-awesome-icon class="ml-2" icon="thumbs-up" />
        </p>
        <template v-if="!hasCrashed">
          <template v-if="preLaunch">
            <div
              class="progress-container"
              :aria-label="`Getting everything ready for ${instanceName}`"
              data-balloon-pos="up"
            >
              <ProgressBar class="mt-6 mb-4" :progress="currentStep.stepProgress" />
            </div>
            <div class="mb-2 text-sm flex items-center">
              <div
                class="progress-spinner"
                aria-label="If this takes more than 5 minutes, kill the instance and try again."
                data-balloon-pos="down-left"
              >
                <font-awesome-icon spin icon="circle-notch" class="mr-4" />
              </div>

              {{ currentStep.stepDesc ? currentStep.stepDesc : 'Initializing...' }}
            </div>
            <p class="mb-2 text-sm" v-if="currentStep.stepProgressHuman !== undefined">
              {{ currentStep.stepProgressHuman }}
            </p>
          </template>
          <template v-else-if="!finishedLoading">
            <div class="loading-area" v-if="currentModpack !== null">
              <div
                class="progress-container"
                :aria-label="`Starting ${instanceName}... this might take a few minutes`"
                data-balloon-pos="up"
              >
                <progress-bar class="mt-6 mb-4" :progress="bars && bars[0] ? bars[0].step / bars[0].steps : 0" />
              </div>
              <div class="mb-2 flex items-center text-sm">
                <div
                  class="progress-spinner"
                  aria-label="If this takes more than 5 minutes, kill the instance and try again."
                  data-balloon-pos="down-left"
                >
                  <font-awesome-icon spin icon="circle-notch" class="mr-4" />
                </div>
                {{ progressMessage }}
              </div>
            </div>
          </template>
          <div v-else class="flex mt-4">
            <ftb-button
              @click="openFolder"
              class="transition ease-in-out duration-200 text-sm py-2 px-4 mr-4"
              color="primary"
            >
              <font-awesome-icon icon="folder-open" class="mr-2" />
              Open instance folder
            </ftb-button>

            <ftb-button
              @click="cancelLoading"
              class="transition ease-in-out duration-200 text-sm py-2 px-4 mr-4 bg-red-600 hover:bg-red-700"
            >
              <font-awesome-icon icon="skull-crossbones" class="mr-2" />
              Kill instance
            </ftb-button>
          </div>
        </template>
        <template v-else>
          <p>Looks like the instance has crashed during startup or whilst running...</p>
          <div class="flex mt-4">
            <ftb-button
              @click="launch"
              color="primary"
              class="transition ease-in-out duration-200 text-sm py-2 px-4 mr-4"
            >
              <font-awesome-icon icon="arrow-rotate-right" class="mr-2" />
              Retry launch
            </ftb-button>
            <ftb-button
              @click="openFolder"
              class="transition ease-in-out duration-200 text-sm py-2 px-4 mr-4"
              color="info"
            >
              <font-awesome-icon icon="folder-open" class="mr-2" />
              Open instance folder
            </ftb-button>
            <ftb-button
              @click="leavePage"
              class="transition ease-in-out duration-200 text-sm py-2 px-4 mr-4 bg-red-600 hover:bg-red-700"
            >
              <font-awesome-icon icon="arrow-left" class="mr-2" />
              Exit
            </ftb-button>
          </div>
        </template>
      </div>
    </header>

    <div class="logs flex justify-between items-center" :class="{ 'dark-mode': darkMode }">
      <h3 class="font-bold text-lg">Log</h3>
      <div class="buttons flex items-center">
        <!--        <ftb-button-->
        <!--          class="transition ease-in-out duration-200 text-xs border border-solid px-2 py-1 mr-4 hover:bg-green-600 hover:text-white hover:border-green-600"-->
        <!--          :class="{ 'border-black': !darkMode, 'border-white': darkMode }"-->
        <!--        >-->
        <!--          <font-awesome-icon icon="upload" class="mr-2" />-->
        <!--          Upload logs-->
        <!--        </ftb-button>-->
        <div
          class="color cursor-pointer ml-4"
          :aria-label="disableFollow ? 'Enable auto-scroll' : 'Disable auto-scroll'"
          data-balloon-pos="down"
          @click="disableFollow = !disableFollow"
        >
          <font-awesome-icon icon="arrow-down" />
        </div>
        <div
          class="color cursor-pointer ml-4"
          :aria-label="darkMode ? 'Light mode' : 'Dark mode'"
          data-balloon-pos="down"
          @click="darkMode = !darkMode"
        >
          <font-awesome-icon :icon="['fas', darkMode ? 'sun' : 'moon']" />
        </div>
        <ftb-button
          @click="showInstance"
          class="transition ease-in-out duration-200 ml-4 py-1 px-4 text-xs border-blue-600 border border-solid hover:bg-blue-600 hover:text-white"
          aria-label="Sometimes an instance can get stuck hidden in the background... You can use this to show the instance if it's not showing up after you think it's finished loading."
          data-balloon-pos="up-right"
          data-balloon-length="xlarge"
        >
          <font-awesome-icon icon="eye" class="" />
        </ftb-button>
        <ftb-button
          @click="cancelLoading"
          class="transition ease-in-out duration-200 ml-4 py-1 px-4 text-xs border-red-600 border border-solid hover:bg-red-600 hover:text-white"
        >
          <font-awesome-icon icon="skull-crossbones" class="mr-2" />
          Kill instance
        </ftb-button>
        <ftb-button
          @click="showOptions = true"
          class="transition ease-in-out duration-200 ml-4 py-1 px-4 text-xs border-orange-600 border border-solid hover:bg-orange-600 hover:text-white"
        >
          <font-awesome-icon icon="ellipsis-vertical" />
        </ftb-button>
      </div>
    </div>
    
    <recycle-scroller id="log-container" :items="logMessages" list-class="allow-overflow-x" key-field="i" :item-size="20" class="select-text scroller log-contents" :class="{ 'dark-mode': darkMode }" v-slot="{ item }">
      <div class="log-item" :class="messageTypes[item.t] + (!darkMode ? '-LIGHT': '')" :key="item.i">{{item.v}}</div>
    </recycle-scroller>
    
    <modal :open="showOptions" title="Instance options" :sub-title="instanceName" @closed="showOptions = false">
      <div class="action-categories">
        <div class="category" v-for="category in instanceActions">
          <div class="title">{{category.title}}</div>
          <div class="actions">
            <template v-for="action in category.actions">
              <ftb-button
                class="transition ease-in-out duration-200 button"
                :class="{[action.color ?? '']: action.color, 'looks-like-button': action.looksLikeButton}"
                v-if="!action.condition || (instance && action.condition({instance, instanceFolders}))"
                @click="runAction(action)"
              >
                <font-awesome-icon :icon="action.icon" class="mr-2" />
                {{ action.title }}
              </ftb-button>
            </template>
          </div>
        </div>
      </div>
    </modal>
  </div>
</template>

<script lang="ts">
import {Component, Vue} from 'vue-property-decorator';
import {ModPack} from '@/modules/modpacks/types';
import {Action, Getter, State} from 'vuex-class';
import platform from '@/utils/interface/electron-overwolf';
import ProgressBar from '@/components/atoms/ProgressBar.vue';
import {validateAuthenticationOrSignIn} from '@/utils/auth/authentication';
import {SettingsState} from '@/modules/settings/types';
import {AuthState} from '@/modules/auth/types';
import {emitter} from '@/utils/event-bus';
import {RouterNames} from '@/router';
import Router from 'vue-router';
import {ns} from '@/core/state/appState';
import {SugaredInstanceJson} from '@/core/@types/javaApi';
import {resolveArtwork, typeIdToProvider} from '@/utils/helpers/packHelpers';
import {GetModpack} from '@/core/state/modpacks/modpacksState';
import {alertController} from '@/core/controllers/alertController';
import {gobbleError} from '@/utils/helpers/asyncHelpers';
import {sendMessage} from '@/core/websockets/websocketsApi';
import {FixedSizeArray} from '@/utils/std/fixedSizeArray';
import {consoleBadButNoLogger} from '@/utils';

type InstanceActionCategory = {
  title: string;
  actions: InstanceAction[];
}

type InstanceAction = {
  title: string;
  icon: string;
  action: (instance: SugaredInstanceJson, router: Router) => void;
  condition?: (context: ConditionContext) => boolean;
  color?: string;
  looksLikeButton?: boolean;
}

type ConditionContext = {
  instance: SugaredInstanceJson;
  instanceFolders: string[];
}

function folderExists(path: string, folders: string[]) {
  if (path === '' || !folders.length) {
    return false;
  }

  return folders.findIndex((e) => e === path) !== -1;
}

function openFolderAction(name: string, path: string): InstanceAction {
  return {
    title: `${name}`,
    icon: "folder-open",
    condition: ({instanceFolders}) => folderExists(path, instanceFolders),
    action: (instance) => {
      sendMessage("instanceBrowse", {
        uuid: instance.uuid,
        folder: path,
      })
    }
  } 
}

const instanceActions: InstanceActionCategory[] = [
  {
    title: "Folders",
    actions: [
      {
        title: "Instance folder",
        icon: "folder-open",
        action: (instance) => {
          sendMessage("instanceBrowse", {
            uuid: instance.uuid,
            folder: null
          })
        }
      },
      openFolderAction("Logs", "logs"),
      openFolderAction("Crash Reports", "crash-reports"),
      openFolderAction("Backups", "backups"),
      openFolderAction("Worlds", "saves"),
      openFolderAction("Configs", "config"),
      openFolderAction("Mods", "mods"),
      openFolderAction("Resource packs", "resourcepacks"),
      openFolderAction("Shaders", "shaderpacks"),
      openFolderAction("Scripts", "scripts"),
      openFolderAction("KubeJS", "kubejs"),
    ]
  },
  {
    title: "Actions",
    actions: [
      {
        title: "Kill instance",
        icon: "skull-crossbones",
        color: "danger",
        action: (instance) => {
          gobbleError(() => {
            sendMessage("instance.kill", {
              uuid: instance.uuid
            })
          })
        },
        looksLikeButton: true
      }
    ]
  }
] 

export interface Bar {
  title: string;
  steps: number;
  step: number;
  message: string;
}

const cleanAuthIds = {
  "START_DANCE": "Starting authentication flow",
  "AUTH_XBOX": "Contacting Xbox Live",
  "AUTH_XSTS": "Authenticating with Xbox Services",
  "LOGIN_XBOX": "Logging in with Xbox Live",
  "GET_PROFILE": "Getting Minecraft Profile",
  "CHECK_ENTITLEMENTS": "Verifying ownership"
}

@Component({
  name: 'LaunchingPage',
  components: {
    ProgressBar,
  },
})
export default class LaunchingPage extends Vue {
  @Getter('instances', ns("v2/instances")) instances!: SugaredInstanceJson[];
  @Getter('getInstance', ns("v2/instances")) getInstance!: (uuid: string) => SugaredInstanceJson | undefined;
  @Action("getModpack", ns("v2/modpacks")) getModpack!: GetModpack;
  
  @Getter("getApiPack", ns("v2/modpacks")) getApiPack!: (id: number) => ModPack | undefined;
  
  @State('settings') public settingsState!: SettingsState;
  @State('auth') public auth!: AuthState;

  loading = false;
  preLaunch = true;
  platform = platform;

  instanceActions = instanceActions
  instanceFolders: string[] = [];
  
  hasCrashed = false;

  darkMode = true;
  disableFollow = false;

  currentStep = {
    stepDesc: '',
    step: 0,
    totalSteps: 0,
    stepProgress: 0,
    stepProgressHuman: '',
  };
  emptyCurrentStep = { ...this.currentStep };

  finishedLoading = false;
  preInitMessages: Set<string> = new Set();

  messages: FixedSizeArray<{ i: number, t: string, v: string }> = new FixedSizeArray<{ i: number, t: string, v: string }>(20_000);
  launchProgress: Bar[] | null | undefined = null;

  showOptions = false;
  lastIndex = 0;

  public cancelLoading() {
    gobbleError(() => {
      sendMessage("instance.kill", {
        uuid: this.instance?.uuid ?? ""
      })
    })
  }

  public async mounted() {
    if (this.instance == null) {
      alertController.error('Instance not found')
      await gobbleError(() => this.$router.push(RouterNames.ROOT_LIBRARY));
      return;
    }

    emitter.on('ws.message', this.onLaunchProgressUpdate);
    await this.getModpack({
      id: this.instance.id,
      provider: typeIdToProvider(this.instance.packType)
    });
    await this.launch();

    sendMessage("getInstanceFolders", {
      uuid: this.instance.uuid
    })
      .then((e) => (this.instanceFolders = e.folders))
      .catch(e => consoleBadButNoLogger("E", e));
  }

  onLaunchProgressUpdate(data: any) {
    if (data.type === 'launchInstance.logs') {
      this.handleLogMessages(data);
    }

    if (data.type === 'launchInstance.status') {
      this.handleInstanceLaunch(data);
    }

    if (data.type === 'clientLaunchData') {
      this.handleClientLaunch(data);
    }
    
    if (data.type === "authenticationStepUpdate") {
      this.messages.push({i: ++this.lastIndex, t: "I", v: `[AUTH][INFO] ${(cleanAuthIds as any)[data.id] ?? data.id} ${data.working ? 'started' : 'finished'} ${!data.working ? (data.successful ? 'successfully' : 'unsuccessfully') : ''}`})
    }

    if (
      data.type === 'launchInstance.stopped' ||
      (data.type === 'launchInstance.reply' && (data.status === 'abort' || data.status === 'error'))
    ) {
      // Lets assume we've crashed
      if (data.status === 'errored' || data.status === 'error') {
        alertController.error(data.status === 'error'
          ? 'Unable to start pack... please see the instance logs...'
          : 'The instance has crashed or has been externally closed.'
        )

        this.hasCrashed = true;
        return; // block the redirection
      }

      this.leavePage();
    }
    
    setInterval(this.scrollToBottom, 100);
  }
  
  scrollToBottom() {
    if (this.disableFollow) {
      return;
    }
    
    const elm = document.getElementById('log-container');
    if (elm) {
      elm.scrollTop = elm.scrollHeight;
    }
  }

  leavePage() {
    if (this.instance) {
      this.$router.push({ name: RouterNames.ROOT_LOCAL_PACK, query: { uuid: this.instance?.uuid } });
    } else {
      this.$router.push({ name: RouterNames.ROOT_LIBRARY });
    }
  }

  async showInstance() {
    await gobbleError(async () => {
      await sendMessage('messageClient', {
        uuid: this.instance?.uuid ?? "",
        message: 'show',
      })
    })
  }

  destroyed() {
    // Stop listening to events!
    emitter.off('ws.message', this.onLaunchProgressUpdate);
    clearInterval(this.scrollToBottom as any)
  }
  
  async lazyLogChecker(messages: string[]) {
    if (this.finishedLoading) {
      return;
    }
    
    // Make an educated guess that when this shows, we're likely good to assume it's loaded
    for (const message of messages) {
      if (message.includes("Created:") && message.includes("minecraft:textures/atlas") && message.includes("TextureAtlas")) {
        this.finishedLoading = true;
      }
    }
  }

  handleLogMessages(data: any) {
    gobbleError(() => this.lazyLogChecker(data.messages));
    
    for (const e of data.messages) {
      this.messages.push(this.formatMessage(e));
    }
  }

  handleInstanceLaunch(data: any) {
    this.currentStep.stepDesc = data.stepDesc;
    this.currentStep.step = data.step;
    this.currentStep.totalSteps = data.totalSteps;
    this.currentStep.stepProgress = data.stepProgress;
    this.currentStep.stepProgressHuman = data.stepProgressHuman;

    if (!this.preInitMessages.has(data.stepDesc)) {
      this.preInitMessages.add(data.stepDesc);
      this.messages.push({i: ++this.lastIndex, t: "I", v: '[FTB APP][INFO] ' + data.stepDesc});
    }
  }

  handleClientLaunch(data: any) {
    consoleBadButNoLogger("I", "Launch data", data);
    if (data.messageType === 'message') {
      this.launchProgress = data.message === 'init' ? [] : undefined;
    } else if (data.messageType === 'progress') {
      if (data.clientData.bars) {
        this.launchProgress = data.clientData.bars;
      }
    } else if (data.messageType === 'clientDisconnect' || (data.messageType === 'message' && data.message === 'done')) {
      this.finishedLoading = true;
    }
  }

  public async launch(): Promise<void> {
    // Reset everything (supports relaunching)
    this.loading = false;
    this.preLaunch = true;
    this.hasCrashed = false;
    this.currentStep = this.emptyCurrentStep;
    this.finishedLoading = false;
    this.preInitMessages = new Set();
    this.messages = new FixedSizeArray<{ i: number, t: string, v: string }>(20_000);
    this.launchProgress = null;
    
    if (!this.$route.query.offline) {
      const refreshResponse = await validateAuthenticationOrSignIn(this.instance?.uuid);
      if (!refreshResponse.ok && !refreshResponse.networkError) {
        if (!this.instance) {
          await this.$router.push({ name: RouterNames.ROOT_LIBRARY });
          return;
        }

        await this.$router.push({ name: RouterNames.ROOT_LOCAL_PACK, query: { uuid: this.instance?.uuid } });
        return;
      } else if (refreshResponse.networkError) {
        await this.$router.push({
          name: RouterNames.ROOT_LOCAL_PACK,
          query: { uuid: this.instance?.uuid, presentOffline: 'true' },
        });
        return;
      }
    }

    const disableChat = this.settingsState.settings.enableChat;
    this.preLaunch = true;

    const result = await sendMessage("launchInstance", {
      uuid: this.instance?.uuid ?? "",
      extraArgs: disableChat ? '-Dmt.disablechat=true' : '',
      offline: this.$route.query.offline === "true",
      offlineUsername: this.$route.query.username as string ?? 'FTB Player',
      cancelLaunch: null
    })
    
    if (result.status === 'error') {
      this.$router.back();
      alertController.warning(result.message);
    } else if (result.status === 'success') {
      this.preLaunch = false;
    }
  }

  openFolder() {
    gobbleError(() => {
      sendMessage("instanceBrowse", {
        uuid: this.instance?.uuid ?? "",
        folder: null
      })
    })
  }

  get instance() {
    return this.getInstance(this.$route.query.uuid as string) ?? null;
  }

  get bars() {
    if (this.launchProgress === null) {
      return [];
    }

    return this.launchProgress?.filter((b) => b.steps !== 1).slice(0, 5);
  }

  get progressMessage() {
    return this.launchProgress?.map((e) => e.message).join(' // ') ?? 'Loading...';
  }

  get instanceName() {
    return (this.instance?.name ?? 'Unknown') + ' ' + (this.instance?.version ?? '');
  }

  get currentModpack() {
    return this.instance;
    // if (this.instance == null) {
    //   return null;
    // }
    // const id: number = this.instance.id;
    // if (this.modpacks.packsCache[id] === undefined) {
    //   return null;
    // }
    // return this.modpacks.packsCache[id];
  }

  messageTypes = {
    "W": "text-orange-200",
    "I": "text-blue-200",
    "E": "text-red-200",
    "W-LIGHT": "text-orange-700",
    "I-LIGHT": "text-blue-700",
    "E-LIGHT": "text-red-700",
  };
  
  typeMap = new Map([
    ["WARN", "W"],
    ["INFO", "I"],
    ["ERROR", "E"]
  ])
  
  lastType = "I";
  formatMessage(message: string): { i: number, t: string, v: string } {
    let type = this.lastType ?? "I";
    const result = /^\[[^\/]+\/([^\]]+)]/.exec(message);
    if (result !== null && result[1]) {
      type = this.typeMap.get(result[1]) ?? "I";
      this.lastType = type;
    }
    
    return {i: ++this.lastIndex, t: type, v: message};
  }

  runAction(action: InstanceAction) {
    if (!this.instance) {
      return;
    }
    
    action.action(this.instance, this.$router);
    this.showOptions = false;
  }
  
  // get artSquare() {
  //   if (!this.currentModpack?.art) {
  //     return 'https://dist.creeper.host/FTB2/wallpapers/alt/T_nw.png';
  //   }
  //
  //   const arts = this.currentModpack.art.filter((art) => art.type === 'square');
  //   return arts.length > 0 ? arts[0].url : 'https://dist.creeper.host/FTB2/wallpapers/alt/T_nw.png';
  // }
    
  get launchStatus() {
    if (this.hasCrashed) {
      return '%s has crashed! 🔥';
    }

    if (!this.finishedLoading) {
      return this.preLaunch ? 'Initializing %s' : 'Starting %s';
    }

    return 'Running %s';
  }
  
  get artLogo() {
    if (!this.instance) {
      return null;
    }
    
    return resolveArtwork(this.instance, "square", this.getApiPack(this.instance!.id) ?? null)
  }
  
  get logMessages() {
    return this.messages.getItems();
  }
}
</script>

<style lang="scss" scoped>

.pack-loading {
  display: flex;
  flex-direction: column;
  position: relative;
  height: 100%;
  max-height: 100%;
  z-index: 1;
  transition: 0.25s ease-in-out background-color;
  background-color: #ececec;

  *::-webkit-scrollbar-corner {
    background-color: #ececec;
    transition: 0.25s ease-in-out background-color;
  }

  &.dark-mode {
    background-color: #1c1c1c;

    *::-webkit-scrollbar-corner {
      background-color: #1c1c1c;
    }
  }

  > header {
    padding: 2rem;
    background-color: #2a2a2a;
  }

  .background {
    position: absolute;
    height: 200px;
    width: 100%;
    top: 0;
    left: 0;
    z-index: -1;

    &::before,
    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
    }

    &::before {
      opacity: 0.5;
      background: black;
    }

    &::after {
      background: linear-gradient(0deg, rgba(black, 1) 25%, rgba(black, 0) 100%);
    }
  }

  .logs {
    padding: 1rem;
    background-color: #1c1c1c;

    header {
      padding: 1rem 1rem 0 1rem;
    }
  }

  > .buttons {
    background-color: #1c1c1c;
    justify-content: flex-end;
    padding: 1rem 1rem 0 1rem;
  }

  .log-contents {
    flex: 1;
    display: flex;
    //flex-direction: column-reverse;
    padding: 1rem 1rem 0 0;
    overflow: auto;
    font-family: 'Consolas', 'Courier New', Courier, monospace;
    margin: 0 0.1rem 0.5rem 1rem;
    font-size: 12px;

    &::-webkit-scrollbar-track {
      background: transparent;
      z-index: 10;
    }

    &::-webkit-scrollbar {
      width: 8px;
      height: 8px;
      border-radius: 150px;
      z-index: 10;
    }

    &.wrap {
      .log-item {
        text-indent: -25px;
        padding-left: 25px;
        white-space: normal;
      }
    }

    .log-item {
      white-space: nowrap;
    }
  }

  .logs,
  .log-contents {
    transition: 0.25s ease-in-out background-color, color 0.25s ease-in-out;
    background-color: #ececec;
    color: #24292e;
    &.dark-mode {
      background-color: #1c1c1c;
      color: white;
    }
  }
  
  &:not(.dark-mode) {
    .log-contents {
      font-weight: 600;
    }
  }
}

.action-categories {
  .category {
    .title {
      font-weight: bold;
      margin-bottom: .5rem;
    }
    
    &:not(:last-child) {
      margin-bottom: 1rem;
    }
    
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      padding: .5rem 0;
      
      .button {
        width: calc(50% - .5rem);
      }
      
      .button {
        padding: .2rem 0;
        
        &.looks-like-button {
          padding: .4rem 1rem;
          background-color: pink;
          
          &.danger {
            background-color: var(--color-danger-button);
          }

          &.warning {
            background-color: var(--color-warning-button);
          }
        }
        
        &:not(.looks-like-button):hover {
          transform: translateX(5px);
          color: #2ca2ff;
        }
      }
    }
  }
}

.update-bar {
  font-weight: 700;
  margin-bottom: 1rem;
}
</style>
