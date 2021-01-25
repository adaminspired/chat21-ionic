import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { ModalController, IonRouterOutlet, NavController } from '@ionic/angular';
import { ActivatedRoute, Router, NavigationExtras } from '@angular/router';

// config
import { environment } from '../../../environments/environment';

// models
import { ConversationModel } from '../../models/conversation';
import { UserModel } from '../../models/user';

// utils
import {
  isInArray,
  checkPlatformIsMobile,
  presentModal,
  closeModal,
  getParameterByName,
  convertMessage,
  windowsMatchMedia
 } from '../../utils/utils';
import { TYPE_POPUP_LIST_CONVERSATIONS, AUTH_STATE_OFFLINE } from '../../utils/constants';
import { EventsService } from '../../services/events-service';
import PerfectScrollbar from 'perfect-scrollbar'; // https://github.com/mdbootstrap/perfect-scrollbar



// pages
// import { LoginModal } from '../../modals/authentication/login/login.modal';

// services
import { DatabaseProvider } from '../../services/database';
// import { ChatConversationsHandler } from '../../services/chat-conversations-handler';
import { ConversationsHandlerService } from 'src/app/services/abstract/conversations-handler.service';
import { ChatManager } from '../../services/chat-manager';
import { NavProxyService } from '../../services/nav-proxy.service';

import { ConversationDetailPage } from '../conversation-detail/conversation-detail.page';
import { ContactsDirectoryPage } from '../contacts-directory/contacts-directory.page';
import { ProfileInfoPage } from '../profile-info/profile-info.page';
import { AuthService } from 'src/app/services/abstract/auth.service';
import { CustomTranslateService } from 'src/app/services/custom-translate.service';

@Component({
  selector: 'app-conversations-list',
  templateUrl: './conversations-list.page.html',
  styleUrls: ['./conversations-list.page.scss'],
})
export class ConversationListPage implements OnInit {
  private subscriptions: Array<string>;
  public tenant: string;
  public loggedUserUid: string;
  public conversations: Array<ConversationModel> = [];
  public uidConvSelected: string;
  public conversationSelected: ConversationModel;
  public uidReciverFromUrl: string;
  public showPlaceholder = true;
  public numberOpenConv = 0;

  public loadingIsActive = true;
  public supportMode = environment.supportMode;

  public convertMessage = convertMessage;
  private isShowMenuPage = false;


  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private navService: NavProxyService,
    public events: EventsService,
    public modalController: ModalController,
    public databaseProvider: DatabaseProvider,
    // public chatConversationsHandler: ChatConversationsHandler,
    public conversationsHandlerService: ConversationsHandlerService,
    public chatManager: ChatManager,
    public authService: AuthService,
    private translateService: CustomTranslateService
  ) {
    // console.log('constructor ConversationListPage');
  }


  private listnerStart() {
    const that = this;
    this.chatManager.BSStart.subscribe((data: any) => {
      console.log('***** BSStart ConversationsListPage *****', data);
      if (data) {
        that.initialize();
      }
    });
  }

  ngOnInit() {
    // console.log('ngOnInit ConversationDetailPage: ');
  }

  ionViewWillEnter() {
    console.log('ionViewWillEnter ------------> uidConvSelected', this.uidConvSelected);
    this.listnerStart();
    // if (this.loggedUserUid) {
    //   // this.initialize();
    // } else {
    //   // this.listnerUserLogged();
    // }
  }



  ionViewDidEnter() {
    // console.log('ConversationListPage ------------> ionViewDidEnter');
  }

  private navigatePage() {
    console.log('navigatePage:: >>>> conversationSelected ', this.conversationSelected);
    let urlPage = 'detail/';
    if (this.conversationSelected) {
      // urlPage = 'conversation-detail/' + this.uidConvSelected;
      urlPage = 'conversation-detail/' + this.uidConvSelected + '/' + this.conversationSelected.conversation_with_fullname;
      // this.openDetailsWithState(this.conversationSelected);
    }
    // else {
    //   this.router.navigateByUrl('detail');
    // }
    console.log('2');
    const navigationExtras: NavigationExtras = {
      state: {
        conversationSelected: this.conversationSelected
      }
    };
    this.navService.openPage(urlPage, ConversationDetailPage, navigationExtras);
  }

  // openDetailsWithState(conversationSelected) {
  //   console.log('openDetailsWithState:: >>>> conversationSelected ', conversationSelected);
  //   let navigationExtras: NavigationExtras = {
  //     state: {
  //       conversationSelected: conversationSelected
  //     }
  //   };
  //   this.router.navigate(['conversation-detail/' + this.uidConvSelected], navigationExtras);
  // }

  // ------------------------------------------------------------------ //
  // BEGIN SUBSCRIPTIONS
  // ------------------------------------------------------------------ //


  /**
   * ::: initConversationsHandler :::
   * inizializzo chatConversationsHandler e archviedConversationsHandler
   * recupero le conversazioni salvate nello storage e pubblico l'evento loadedConversationsStorage
   * imposto uidConvSelected in conversationHandler e chatArchivedConversationsHandler
   * e mi sottoscrivo al nodo conversazioni in conversationHandler e chatArchivedConversationsHandler (connect)
   * salvo conversationHandler in chatManager
   */
  initConversationsHandler(userId: string) {
    const keys = [
      'LABEL_TU'
    ];
    const translationMap = this.translateService.translateLanguage(keys);

    console.log('initConversationsHandler ------------->', userId, this.tenant);
    // 1 - init chatConversationsHandler and  archviedConversationsHandler
    this.conversationsHandlerService.initialize(this.tenant, userId, translationMap);
    // 2 - get conversations from storage
    // this.chatConversationsHandler.getConversationsFromStorage();
    // 5 - connect conversationHandler and archviedConversationsHandler to firebase event (add, change, remove)
    this.conversationsHandlerService.connect();
    this.conversations = this.conversationsHandlerService.conversations;
   
    // 6 - save conversationHandler in chatManager
    this.chatManager.setConversationsHandler(this.conversationsHandlerService);
    const that = this;
    this.showPlaceholder = false;
    setTimeout( () => {
      if (!that.conversations || that.conversations.length === 0) {
        this.showPlaceholder = true;
      }
    }, 2000);
  }
  /** */
  initSubscriptions() {
    let key = '';
    // key = 'loggedUser:login';
    // if (!isInArray(key, this.subscriptions)) {
    //   this.subscriptions.push(key);
    //   this.events.subscribe(key, this.subscribeLoggedUserLogin);
    // }
    key = 'loggedUser:logout';
    if (!isInArray(key, this.subscriptions)) {
      this.subscriptions.push(key);
      this.events.subscribe(key, this.subscribeLoggedUserLogout);
    }
    // key = 'conversationsChanged';
    // if (!isInArray(key, this.subscriptions)) {
    //   this.subscriptions.push(key);
    //   this.events.subscribe(key, this.conversationsChanged);
    // }
    key = 'readAllMessages';
    if (!isInArray(key, this.subscriptions)) {
      this.subscriptions.push(key);
      this.events.subscribe(key, this.readAllMessages);
    }

    this.conversationsHandlerService.readAllMessages.subscribe((conversationId: string) => {
      console.log('***** readAllMessages *****', conversationId);
      this.readAllMessages(conversationId);
    });

    // key = 'uidConvSelected:changed';
    // if (!isInArray(key, this.subscriptions)) {
    //   this.subscriptions.push(key);
    //   this.events.subscribe(key, this.subscribeChangedConversationSelected);
    // }

    const that = this;
    this.conversationsHandlerService.conversationsAdded.subscribe((conversations: any) => {
      // console.log('***** conversationsAdded *****', conversations);
      // that.conversationsChanged(conversations);
    });
    this.conversationsHandlerService.conversationsChanged.subscribe((conversations: any) => {
      // console.log('***** conversationsChanged *****', conversations);
      // that.conversationsChanged(conversations);
    });
    this.conversationsHandlerService.conversationsRemoved.subscribe((conversations: any) => {
      // console.log('***** conversationsRemoved *****', conversations);
      // that.conversationsChanged(conversations);
    });

  }
  // CALLBACKS //

  /**
   * ::: readAllMessages :::
   * quando tutti i messaggi della chat risultano visualizzati,
   * cioè quando nel dettaglio conversazione mi porto al bottom della pagina,
   * scatta l'evento readAllMessages che viene intercettato nell'elenco conversazioni
   * e modifica la conversazione attuale portando is_new a true
   */
  readAllMessages = (uid: string) => {
    console.log('************** readAllMessages', uid);
    const conversationSelected = this.conversations.find(item => item.uid === this.uidConvSelected);
    if (conversationSelected) {
      conversationSelected.is_new = false;
      conversationSelected.status = '0';
      conversationSelected.selected = true;
    }
  }


  // /**
  //  * ::: subscribeLoggedUserLogin :::
  //  * effettuato il login:
  //  * 1 - imposto loggedUser
  //  * 2 - dismetto modale
  //  * 3 - inizializzo elenco conversazioni
  //  */
  // subscribeLoggedUserLogin = (user: any) => {
  //   console.log('3 ************** subscribeLoggedUserLogin', user);
  //   this.loggedUser = user;
  //   try {
  //     closeModal(this.modalController);
  //   } catch (err) {
  //     console.error('-> error:', err);
  //   }
  //   this.initialize();
  // }

  /**
   * ::: subscribeLoggedUserLogout :::
   * effettuato il logout:
   * 1 - resetto array conversazioni
   * 2 - resetto conversazione selezionata
   * 3 - mostro modale login
   */
  subscribeLoggedUserLogout = () => {
    console.log('************** subscribeLoggedUserLogout');
    this.conversations = [];
    this.uidConvSelected = null;
    // presentModal(this.modalController, LoginModal, { tenant: this.tenant, enableBackdropDismiss: false });
  }

  /**
   * ::: conversationsChanged :::
   * evento richiamato su add, change, remove dell'elenco delle conversazioni
   * 1 - aggiorno elenco conversazioni
   * 2 - aggiorno il conto delle nuove conversazioni
   * 4 - se esiste un uidReciverFromUrl (passato nell'url)
   *    e se esiste una conversazione con lo stesso id di uidReciverFromUrl
   *    imposto questa come conversazione attiva (operazione da fare una sola volta al caricamento delle conversazioni) 
   *    e la carico nella pagina di dettaglio e azzero la variabile uidReciverFromUrl!!!
   * 5 - altrimenti se esiste una conversazione con lo stesso id della conversazione attiva
   *    e la pagina di dettaglio è vuota (placeholder), carico la conversazione attiva (uidConvSelected) nella pagina di dettaglio 
   *    (operazione da fare una sola volta al caricamento delle conversazioni)
   */
  conversationsChanged = (conversations: ConversationModel[]) => {
    const that = this;
    // this.conversations = conversations;
    this.numberOpenConv = this.conversationsHandlerService.countIsNew();
    console.log('LISTA CONVERSAZIONI »»»»»»»»» conversationsChanged - CONVERSATIONS: ', this.numberOpenConv);
    // console.log('conversationsChanged »»»»»»»»» uidConvSelected', that.conversations[0], that.uidConvSelected);
    if (that.uidConvSelected && !this.conversationSelected) {
      const conversationSelected = that.conversations.find(item => item.uid === that.uidConvSelected);
      if (conversationSelected) {
        console.log('11111');
        this.conversationSelected = conversationSelected;
        that.setUidConvSelected(that.uidConvSelected);
      }
      // localStorage.setItem('conversationSelected', JSON.stringify(conversationSelected));
    }
    // }
  }


  /**
   * ::: subscribeChangedConversationSelected :::
   * evento richiamato quando si seleziona un utente nell'elenco degli user
   * apro dettaglio conversazione
   */
  subscribeChangedConversationSelected = (user: UserModel, type: string) => {
    console.log('************** subscribeUidConvSelectedChanged navigateByUrl', user, type);
    this.uidConvSelected = user.uid;
    this.conversationsHandlerService.uidConvSelected = user.uid;
    const conversationSelected = this.conversations.find(item => item.uid === this.uidConvSelected);
    if (conversationSelected) {
      console.log('--> uidConvSelected: ', this.conversationSelected, this.uidConvSelected );
      this.conversationSelected = conversationSelected;
    }
    // this.router.navigateByUrl('conversation-detail/' + user.uid + '?conversationWithFullname=' + user.fullname);
  }
  // ------------------------------------------------------------------//
  // END SUBSCRIPTIONS
  // ------------------------------------------------------------------//



  // ------------------------------------------------------------------//
  // BEGIN FUNCTIONS
  // ------------------------------------------------------------------//
  /**
   * ::: initialize :::
   */
  initialize() {
    this.tenant = environment.tenant;
    this.loggedUserUid = this.authService.getCurrentUser().uid;
    this.subscriptions = [];
    this.initConversationsHandler(this.loggedUserUid);
    this.databaseProvider.initialize(this.loggedUserUid, this.tenant);
    this.initVariables();
    this.initSubscriptions();
  }


  /**
   * ::: initVariables :::
   * al caricamento della pagina:
   * setto BUILD_VERSION prendendo il valore da PACKAGE
   * recupero conversationWith -
   * se vengo da dettaglio conversazione o da users con conversazione attiva ???? sarà sempre undefined da spostare in ionViewDidEnter
   * recupero tenant
   * imposto recipient se esiste nei parametri passati nell'url
   * imposto uidConvSelected recuperando id ultima conversazione aperta dallo storage
   */
  initVariables() {
    const that = this;
    // const TEMP = getParameterByName('recipient');
    // if (TEMP) {
    //   this.uidReciverFromUrl = TEMP;
    // }
    console.log('uidReciverFromUrl:: ' + this.uidReciverFromUrl);
    console.log('loggedUserUid:: ' + this.loggedUserUid);
    console.log('tenant:: ' + this.tenant);
    const IDConv = this.route.snapshot.firstChild.paramMap.get('IDConv');
    console.log('ConversationListPage .conversationWith: ', IDConv);
    if (IDConv) {
      console.log('22222');
      this.setUidConvSelected(IDConv);
    } else {
      this.databaseProvider.getUidLastOpenConversation()
      .then((uid: string) => {
        console.log('getUidLastOpenConversation:: ' + uid);
        console.log('33333');
        that.navigateByUrl(uid);
      })
      .catch((error) => {
        console.log('44444');
        console.log('error::: ', error);
      });
    }
    console.log('::::tenant:::: ', this.tenant);
    console.log('::::uidReciverFromUrl:::: ', this.uidReciverFromUrl);
  }


  // /**
  //  * ::: initConversationsHandler :::
  //  * inizializzo chatConversationsHandler e archviedConversationsHandler
  //  * recupero le conversazioni salvate nello storage e pubblico l'evento loadedConversationsStorage
  //  * imposto uidConvSelected in conversationHandler e chatArchivedConversationsHandler
  //  * e mi sottoscrivo al nodo conversazioni in conversationHandler e chatArchivedConversationsHandler (connect)
  //  * salvo conversationHandler in chatManager
  //  */
  // initConversationsHandler() {
  //   console.log('initConversationsHandler -------------> initConversationsHandler');
  //   /// const tenant = this.chatManager.getTenant();
  //   /// const loggedUser = this.chatManager.getLoggedUser();

  //   // 1 - init chatConversationsHandler and  archviedConversationsHandler
  //   this.chatConversationsHandler = this.chatConversationsHandler.initWithTenant(this.tenant, this.loggedUser);
  //   // this.chatArchivedConversationsHandler = this.chatArchivedConversationsHandler.initWithTenant(this.tenant, this.loggedUser);

  //   // 2 - get conversations from storage
  //   this.chatConversationsHandler.getConversationsFromStorage();

  //   // 3 - set uidConvSelected in conversationHandler
  //   this.chatConversationsHandler.uidConvSelected = this.uidConvSelected;
  //   // this.chatArchivedConversationsHandler.uidConvSelected = this.uidConvSelected

  //   // 5 - connect conversationHandler and archviedConversationsHandler to firebase event (add, change, remove)
  //   this.chatConversationsHandler.connect();
  //   // this.chatArchivedConversationsHandler.connect();

  //   // 6 - save conversationHandler in chatManager
  //   this.chatManager.setConversationsHandler(this.chatConversationsHandler);
  // }

  /**
   * ::: setUidConvSelected :::
   */
  setUidConvSelected(uidConvSelected?: string) {
    this.uidConvSelected = uidConvSelected;
    this.conversationsHandlerService.uidConvSelected = uidConvSelected;
    if (uidConvSelected) {
      const conversationSelected = this.conversations.find(item => item.uid === this.uidConvSelected);
      if (conversationSelected) {
        console.log('la conv ' + this.conversationSelected + ' è già stata caricata');
        this.conversationSelected = conversationSelected;
        console.log('setUidConvSelected: ', this.conversationSelected);
        this.databaseProvider.setUidLastOpenConversation(uidConvSelected);
        localStorage.setItem('conversationSelected', JSON.stringify(this.conversationSelected));
      }
    }
  }

  navigateByUrl(uidConvSelected: string) {
    this.setUidConvSelected(uidConvSelected);
    if (checkPlatformIsMobile()) {
      console.log('PLATFORM_MOBILE 1', this.navService);
      // this.router.navigateByUrl('conversations-list');
    } else {
      console.log('PLATFORM_DESKTOP 2', this.navService);
      let pageUrl = 'conversation-detail/' + this.uidConvSelected;
      if (this.conversationSelected && this.conversationSelected.conversation_with_fullname) {
        pageUrl = 'conversation-detail/' + this.uidConvSelected + '/' + this.conversationSelected.conversation_with_fullname;
      }
      // let pageUrl = 'detail/' + this.uidConvSelected;
      // if (this.conversationSelected && this.conversationSelected.conversation_with_fullname) {
      //   pageUrl = 'detail/' + this.uidConvSelected + '/' + this.conversationSelected.conversation_with_fullname;
      // }
      console.log('setUidConvSelected navigateByUrl--->: ', pageUrl);
      this.router.navigateByUrl(pageUrl);

      // this.router.routeReuseStrategy.shouldReuseRoute = () => false;
      // this.router.onSameUrlNavigation = 'reload';
      // this.router.navigateByUrl(pageUrl);

    }
  }


  /**
   * ::: onOpenContactsDirectory :::
   * apro pagina elenco users
   * (metodo richiamato da html)
   */
  openContactsDirectory(event: any) {
    const TOKEN = this.authService.getTiledeskToken();
    console.log('openContactsDirectory', TOKEN );
    if (checkPlatformIsMobile()) {
      presentModal(this.modalController, ContactsDirectoryPage, { token: TOKEN });
    } else {
      this.navService.push(ContactsDirectoryPage, { token: TOKEN });
    }
  }

  /** */
  closeContactsDirectory() {
    try {
      closeModal(this.modalController);
    } catch (err) {
      console.error('-> error:', err);
    }
  }

  /**
   * ::: onOpenProfileInfo :::
   * apro pagina profilo
   * (metodo richiamato da html)
   */
  openProfileInfo(event: any) {
    const TOKEN = this.authService.getToken();
    console.log('open ProfileInfoPage', TOKEN );
    if (checkPlatformIsMobile()) {
      presentModal(this.modalController, ProfileInfoPage, { token: TOKEN });
    } else {
      this.navService.push(ProfileInfoPage, { token: TOKEN });
    }
  }

  /**
   * ::: openMessageList :::
   * 1 - cerco conv con id == this.uidConvSelected e imposto select a FALSE
   * 2 - cerco conv con id == nw uidConvSelected se esiste:
   * 2.1 - imposto status a 0 come letto
   * 2.2 - seleziono conv selected == TRUE
   * 2.3 - imposto nw uidConvSelected come this.uidConvSelected
   * 2.4 - apro conv
   * 3 salvo id conv nello storage
   */
  // is_new lo cambio a false quando leggo tutti i messaggi della conversazione,
  // cioè quando scatta l evento che indica che sono al bottom della pagina

  openMessageList(type?: string) {
    const that = this;
    console.log('openMessageList:: >>>> conversationSelected ', that.uidConvSelected);
    // if the conversation from the isConversationClosingMap is waiting to be closed
    // deny the click on the conversation
    if (this.conversationsHandlerService.getClosingConversation(this.uidConvSelected)) { return; }

    setTimeout(() => {
      const conversationSelected = that.conversations.find(item => item.uid === that.uidConvSelected);
      if (conversationSelected) {
        // conversationSelected.is_new = false;
        // conversationSelected.status = '0';
        // conversationSelected.selected = true;
        // that.navProxy.pushDetail(DettaglioConversazionePage, {
        //   conversationSelected: conversationSelected,
        //   conversationWith: that.uidConvSelected,
        //   conversationWithFullname: conversationSelected.conversation_with_fullname,
        //   channelType: conversationSelected.channelType
        // });
        // that.conversationsHandler.setConversationRead(conversationSelected.uid);
        that.databaseProvider.setUidLastOpenConversation(that.uidConvSelected);
        // that.openDetailsWithState(conversationSelected);
        // const urlPage = 'conversation-detail/' + that.uidConvSelected
        const urlPage = 'conversation-detail/' + that.uidConvSelected + '/' + conversationSelected.conversation_with_fullname;
        const navigationExtras: NavigationExtras = {
          state: {
            conversationSelected: that.conversationSelected
          }
        };
        console.log('1 openPage', urlPage);
        this.router.navigateByUrl(urlPage);
        // that.navService.openPage(urlPage, ConversationDetailPage, navigationExtras);
      } else if (!type) {
        if (windowsMatchMedia()) {
          // that.navProxy.pushDetail(PlaceholderPage, {});
        }
      }
    }, 0);
  }

  // if (checkPlatformIsMobile()) {
  //   this.platformIs = PLATFORM_MOBILE;
  //   console.log('PLATFORM_MOBILE2 navigateByUrl', PLATFORM_MOBILE);
  //   this.router.navigateByUrl(pageUrl);
  //   // this.navService.setRoot(ConversationListPage, {});
  // } else {
  //   console.log('PLATFORM_DESKTOP', this.navService, pageUrl);
  //   this.platformIs = PLATFORM_DESKTOP;
  //   this.navService.setRoot(ConversationListPage, {});

  //   console.log('checkPlatform navigateByUrl', pageUrl);
  //   this.router.navigateByUrl(pageUrl);

  //   const DASHBOARD_URL = this.appConfigProvider.getConfig().DASHBOARD_URL;
  //   createExternalSidebar(this.renderer, DASHBOARD_URL);
  // }


  /**
   * ::: closeConversation :::
   * chiudo conversazione
   * (metodo richiamato da html) 
   * the conversationId is:
   * - se è una conversazione diretta: elimino conversazione 
   * - se è una conversazione di gruppo: chiudo conversazione 
   * @param conversation 
   * https://github.com/chat21/chat21-cloud-functions/blob/master/docs/api.md#delete-a-conversation
   */
  closeConversation(conversation) {
    var conversationId = conversation.uid;
    // var isSupportConversation = conversationId.startsWith("support-group");
    // if (!isSupportConversation) {
    //   this.deleteConversation(conversationId, function (result, data) {
    //     if (result === 'success') {
    //       console.log("ListaConversazioniPage::closeConversation::deleteConversation::response", data);
    //     } else if (result === 'error') {
    //       console.error("ListaConversazioniPage::closeConversation::deleteConversation::error", data);
    //     }
    //   });
    // } else {
    //   this.closeSupportGroup(conversationId, function (result: string, data: any) {
    //     if (result === 'success') {
    //       console.log("ListaConversazioniPage::closeConversation::closeSupportGroup::response", data);
    //     } else if (result === 'error') {
    //       console.error("ListaConversazioniPage::closeConversation::closeSupportGroup::error", data);
    //     }
    //   });
    // }
  }

  /**
   * ::: openArchivedConversationsPage :::
   * Open the archived conversations page
   * (metodo richiamato da html)
   */
  openArchivedConversationsPage() {
    console.log('openArchivedConversationsPage');
    // this.router.navigate(['/']);
    // this.navCtrl.push(ArchivedConversationsPage, {
    //   'archivedConversations': this.archivedConversations,
    //   'tenant': this.tenant,
    //   'loggedUser': this.loggedUser
    // });
  }


  // info page
  returnCloseInfoPage() {
    console.log('returnCloseInfoPage');
    // this.isShowMenuPage = false;
    this.initialize();

  }
}
