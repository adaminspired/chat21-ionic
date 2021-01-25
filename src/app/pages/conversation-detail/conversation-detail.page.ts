import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer} from '@angular/platform-browser';

import { 
  ModalController, 
  PopoverController, 
  Platform, ActionSheetController, NavController, IonContent, IonTextarea } from '@ionic/angular';


// translate
import { TranslateService } from '@ngx-translate/core';

// models
import { UserModel } from '../../models/user';
import { MessageModel } from '../../models/message';
import { ConversationModel } from '../../models/conversation';

// services
import { AuthService } from '../../services/abstract/auth.service';
import { ChatManager } from '../../services/chat-manager';
import { AppConfigProvider } from '../../services/app-config';
import { DatabaseProvider } from '../../services/database';
import { CustomTranslateService } from 'src/app/services/custom-translate.service';
import { TypingService } from 'src/app/services/abstract/typing.service';
import { ConversationHandlerBuilderService } from 'src/app/services/abstract/conversation-handler-builder.service';

// import { ChatConversationsHandler } from '../../services/chat-conversations-handler';
import { ConversationsHandlerService } from 'src/app/services/abstract/conversations-handler.service';
import { ConversationHandlerService } from 'src/app/services/abstract/conversation-handler.service';
// import { CurrentUserService } from 'src/app/services/current-user/current-user.service';
import { ContactsService } from 'src/app/services/contacts/contacts.service';

// import { CannedResponsesServiceProvider } from '../../services/canned-responses-service';
// import { GroupService } from '../../services/group';

// pages
// import { _DetailPage } from '../_DetailPage';
// import { ProfilePage } from '../profile/profile';
// import { PopoverPage } from '../popover/popover';

// utils
import {
  SYSTEM,
  TYPE_SUPPORT_GROUP,
  TYPE_POPUP_DETAIL_MESSAGE,
  TYPE_DIRECT, MAX_WIDTH_IMAGES,
  TYPE_MSG_TEXT, TYPE_MSG_IMAGE,
  MIN_HEIGHT_TEXTAREA,
  MSG_STATUS_SENDING,
  MSG_STATUS_SENT,
  MSG_STATUS_RETURN_RECEIPT,
  TYPE_GROUP,
  MESSAGE_TYPE_INFO,
  MESSAGE_TYPE_MINE,
  MESSAGE_TYPE_OTHERS,
  MESSAGE_TYPE_DATE,
  AUTH_STATE_OFFLINE
} from '../../utils/constants';

import {
  isInArray,
  isPopupUrl,
  popupUrl,
  stripTags,
  urlify,
  convertMessageAndUrlify,
  checkPlatformIsMobile,
  closeModal,
  setConversationAvatar,
  setChannelType
} from '../../utils/utils';

import {
  getColorBck,
  avatarPlaceholder,
  getImageUrlThumbFromFirebasestorage,
} from '../../utils/utils-user';

import {
  isFirstMessage,
  isImage,
  isFile,
  isInfo,
  isMine,
  messageType
} from '../../utils/utils-message';

// import { EventsService } from '../../services/events-service';
// import { initializeApp } from 'firebase';
import { Keyboard } from '@ionic-native/keyboard/ngx';
import { Subscription } from 'rxjs';
import { environment } from 'src/environments/environment';
import {NgxLinkifyjsService, Link, LinkType, NgxLinkifyOptions} from 'ngx-linkifyjs';

@Component({
  selector: 'app-conversation-detail',
  templateUrl: './conversation-detail.page.html',
  styleUrls: ['./conversation-detail.page.scss'],
})



export class ConversationDetailPage implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('ionContentChatArea', {static: false}) ionContentChatArea: IonContent;
  @ViewChild('rowMessageTextArea', {static: false}) rowTextArea: ElementRef;

  showButtonToBottom = false; // indica lo stato del pulsante per scrollare la chat (showed/hidden)
  NUM_BADGES = 0; // numero di messaggi non letti
  COLOR_GREEN = '#24d066'; // colore presence active da spostare nelle costanti
  COLOR_RED = '#db4437'; // colore presence none da spostare nelle costanti

  private subscriptions: Array<any>;
  private tenant: string;
  public loggedUser: UserModel;
  public conversationWith: string;
  public conversationWithFullname: string;
  public messages: Array<MessageModel> = [];
  private conversationSelected: any;
  // public attributes: any;
  public messageSelected: any;
  public channelType: string;
  public online: boolean;
  public lastConnectionDate: string;
  public showMessageWelcome: boolean;
  public openInfoConversation = false;
  public openInfoMessage: boolean;              /** check is open info message */
  public isMobile = false;
  public isTyping = false;
  public nameUserTypingNow: string;

  public heightMessageTextArea = '';
  public translationMap: Map<string, string>;
  public conversationAvatar: any;
  public membersConversation: any;
  public member: UserModel;
  public urlConversationSupportGroup: any;
  private tagsCanned: any = [];
  private isFileSelected: boolean;
  private timeScrollBottom: any;
  public showIonContent = false;

  MESSAGE_TYPE_INFO = MESSAGE_TYPE_INFO;
  MESSAGE_TYPE_MINE = MESSAGE_TYPE_MINE;
  MESSAGE_TYPE_OTHERS = MESSAGE_TYPE_OTHERS;

  // functions utils
  isMine = isMine;
  isInfo = isInfo;
  isFirstMessage = isFirstMessage;
  messageType = messageType;


  private linkifyOptions: NgxLinkifyOptions = {
    className: 'linkify',
    target : {
      url : '_blank'
    }
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public chatManager: ChatManager,
    public actionSheetCtrl: ActionSheetController,
    public platform: Platform,
    // private upSvc: UploadService,
    private translateService: TranslateService,
    private customTranslateService: CustomTranslateService,
    public appConfigProvider: AppConfigProvider,
    private databaseProvider: DatabaseProvider,
    private keyboard: Keyboard,
    public modalController: ModalController,
    public typingService: TypingService,
    private sanitizer: DomSanitizer,
    public authService: AuthService,
    // public chatConversationsHandler: ChatConversationsHandler,
    public conversationsHandlerService: ConversationsHandlerService,
    public conversationHandlerService: ConversationHandlerService,
    // public currentUserService: CurrentUserService,
    // public cannedResponsesServiceProvider: CannedResponsesServiceProvider,
    // public groupService: GroupService
    public contactsService: ContactsService,
    public conversationHandlerBuilderService: ConversationHandlerBuilderService,
    public linkifyService: NgxLinkifyjsService
  ) {
  }

  // -------------- SYSTEM FUNCTIONS -------------- //
  private listnerStart() {
    const that = this;
    this.chatManager.BSStart.subscribe((data: any) => {
      console.log('***** BSStart ConversationDetailPage *****', data);
      if (data) {
        that.initialize();
      }
    });
  }

  /** */
  // con il routing la gestione delle pagine è automatica (da indagare),
  // non sempre passa da ngOnInit/ngOnDestroy! Evitare di aggiungere logica qui
  //
  ngOnInit() {
    // console.log('ngOnInit ConversationDetailPage: ');
  }

  ngAfterViewInit() {
    // console.log('ngAfterViewInit ConversationDetailPage: ');
  }

  ngOnDestroy() {
    // console.log('ngOnDestroy ConversationDetailPage: ');
  }

  /** */
  ionViewWillEnter() {
    this.loggedUser = this.authService.getCurrentUser();
    console.log('ionViewWillEnter ConversationDetailPage: ', this.loggedUser);
    this.listnerStart();
    // if (this.loggedUser) {
    //   this.initialize();
    // } else {
    //   this.listnerUserLogged();
    // }
  }



  /** */
  ionViewDidEnter() {
  }

  /**
   * quando esco dalla pagina distruggo i subscribe
   * e chiudo la finestra di info
   */
  ionViewWillLeave() {
    // console.log('ionViewWillLeave ConversationDetailPage: ');
    this.unsubescribeAll();
  }

  // -------------- START MY functions -------------- //
  /** */
  initialize() {
    this.loggedUser = this.authService.getCurrentUser();
    this.translations();
    // this.conversationSelected = localStorage.getItem('conversationSelected');
    this.showButtonToBottom = false;
    this.showMessageWelcome = false;
    this.tenant = environment.tenant;

    // Change list on date change
    this.route.paramMap.subscribe(params => {
      this.conversationWith = params.get('IDConv');
      this.conversationWithFullname = params.get('FullNameConv');
    });

    console.log('initialize ConversationDetailPage: ', this.conversationWith, this.conversationWithFullname );
    this.subscriptions = [];
    this.setHeightTextArea();
    this.tagsCanned = []; // list of canned
    this.messages = []; // list messages of conversation
    this.isFileSelected = false; // indica se è stato selezionato un file (image da uplodare)
    this.openInfoMessage = false; // indica se è aperto il box info message
    if (checkPlatformIsMobile()) {
      this.isMobile = true;
      this.openInfoConversation = false; // indica se è aperto il box info conversazione
    } else {
      this.isMobile = false;
      this.openInfoConversation = true;
    }
    this.online = false;
    this.lastConnectionDate = '';

    // init handler vengono prima delle sottoscrizioni!
    this.initConversationsHandler();
    this.initConversationHandler();
    this.initSubscriptions();
    this.addEventsKeyboard();
    this.startConversation();
  }


  /**
   * translations
   * translationMap passed to components in the html file
   */
  public translations() {
    const keys = [
      'LABEL_AVAILABLE',
      'LABEL_NOT_AVAILABLE',
      'LABEL_TODAY',
      'LABEL_TOMORROW',
      'LABEL_TO',
      'LABEL_LAST_ACCESS',
      'ARRAY_DAYS',
      'LABEL_ACTIVE_NOW',
      'LABEL_IS_WRITING'
    ];
    this.translationMap = this.customTranslateService.translateLanguage(keys);
  }

  /**
   * setTranslationMapForConversationHandler
   */
  private setTranslationMapForConversationHandler(): Map<string, string> {
    const keys = [
      'INFO_SUPPORT_USER_ADDED_SUBJECT',
      'INFO_SUPPORT_USER_ADDED_YOU_VERB',
      'INFO_SUPPORT_USER_ADDED_COMPLEMENT',
      'INFO_SUPPORT_USER_ADDED_VERB',
      'INFO_SUPPORT_CHAT_REOPENED',
      'INFO_SUPPORT_CHAT_CLOSED',
      'LABEL_TODAY',
      'LABEL_TOMORROW',
      'LABEL_LAST_ACCESS',
      'LABEL_TO',
      'ARRAY_DAYS'
    ];
    return this.customTranslateService.translateLanguage(keys);
  }

  /**
   * recupero da chatManager l'handler
   * se NON ESISTE creo un handler e mi connetto e lo memorizzo nel chatmanager
   * se ESISTE mi connetto
   * carico messaggi
   * attendo x sec se nn arrivano messaggi visualizzo msg wellcome
   */
  initConversationHandler() {
    const translationMap = this.setTranslationMapForConversationHandler();
    this.showMessageWelcome = false;
    const handler: ConversationHandlerService = this.chatManager.getConversationHandlerByConversationId(this.conversationWith);
    console.log('DETTAGLIO CONV - handler **************', handler, this.conversationWith);
    if (!handler) {
      this.conversationHandlerService = this.conversationHandlerBuilderService.build();
      this.conversationHandlerService.initialize(
        this.conversationWith,
        this.conversationWithFullname,
        this.loggedUser,
        this.tenant,
        translationMap
      );
      this.conversationHandlerService.connect();
      console.log('DETTAGLIO CONV - NEW handler **************', this.conversationHandlerService);
      this.messages = this.conversationHandlerService.messages;

      this.chatManager.addConversationHandler(this.conversationHandlerService);

      // attendo un secondo e poi visualizzo il messaggio se nn ci sono messaggi
      const that = this;
      setTimeout( () => {
        if (!that.messages || that.messages.length === 0) {
          this.showIonContent = true;
          that.showMessageWelcome = true;
          console.log('setTimeout ***', that.showMessageWelcome);
        }
      }, 8000);

    } else {
      console.log('NON ENTRO ***', this.conversationHandlerService, handler);
      this.conversationHandlerService = handler;
      this.messages = this.conversationHandlerService.messages;
      // sicuramente ci sono messaggi
      // la conversazione l'ho già caricata precedentemente
      // mi arriva sempre notifica dell'ultimo msg (tramite BehaviorSubject)
      // scrollo al bottom della pagina
    }
    console.log('CONVERSATION MESSAGES ' + this.messages + this.showIonContent);
  }


  initConversationsHandler() {
    console.log('initConversationsHandler ------------->:::', this.tenant, this.loggedUser.uid, this.conversationWith);
    this.conversationsHandlerService.getConversationDetail(this.tenant, this.loggedUser.uid, this.conversationWith);
  }



  /**
   * startConversation
   */
  startConversation() {
    console.log('startConversation: ', this.conversationWith);
    if (this.conversationWith) {
      this.channelType = setChannelType(this.conversationWith);
      console.log('setChannelType: ', this.channelType);
      // this.selectInfoContentTypeComponent();
      this.setHeaderContent();
    }
  }

  setHeaderContent() {
    this.conversationAvatar = setConversationAvatar(
      this.conversationWith,
      this.conversationWithFullname,
      this.channelType
    );
    console.log('this.conversationAvatar: ', this.conversationAvatar);
  }

  // -------------- START SET INFO COMPONENT -------------- //
  /**
   *
   */
  selectInfoContentTypeComponent() {
    console.log('selectInfoContentTypeComponent: ', this.conversationWith);
    if (this.conversationWith) {
      this.channelType = setChannelType(this.conversationWith);
      if (this.channelType === TYPE_DIRECT) {
        this.setInfoDirect();
      } else if (this.channelType === TYPE_GROUP) {
        this.setInfoGroup();
      } else if (this.channelType === TYPE_SUPPORT_GROUP) {
        this.urlConversationSupportGroup = '';
        this.setInfoSupportGroup();
      }
    }
  }

  /**
   *
   */
  setInfoDirect() {
    console.log('setInfoDirect:::: ', this.contactsService, this.conversationWith);
    this.member = null;
    const that = this;
    const tiledeskToken = this.authService.getTiledeskToken();
    this.contactsService.loadContactDetail(tiledeskToken, this.conversationWith);
  }

  /**
   *
   */
  setInfoGroup() {
    // group
  }

  /**
   *
   */
  setInfoSupportGroup() {
    let projectID = '';
    const tiledeskToken = this.authService.getTiledeskToken();
    const DASHBOARD_URL = this.appConfigProvider.getConfig().DASHBOARD_URL;
    if (this.conversationSelected) {
      projectID = this.conversationSelected.attributes.projectId;
    }
    if (projectID && this.conversationWith) {
      let urlPanel = DASHBOARD_URL + '#/project/' + projectID + '/request-for-panel/' + this.conversationWith;
      urlPanel += '?token=' + tiledeskToken;
      const urlConversationTEMP = this.sanitizer.bypassSecurityTrustResourceUrl(urlPanel);
      this.urlConversationSupportGroup = urlConversationTEMP;
    } else {
      this.urlConversationSupportGroup = this.sanitizer.bypassSecurityTrustResourceUrl(DASHBOARD_URL);
    }
    console.log('this.urlConversationSupportGroup:: ', this.urlConversationSupportGroup, this.conversationSelected);
  }
  // -------------- END SET INFO COMPONENT -------------- //



  

  /**
   *
   */
  // connectConversation(conversationId: string) {
  //   const that = this;
  //   console.log('-----> connectConversation: ', conversationId);
  //   this.conversationHandler.connectConversation(conversationId)
  //   .then((snapshot) => {
  //     console.log('-----> conversation snapshot: ', snapshot.val());
  //     if (snapshot.val()) {
  //       console.log('-----> conversation snapshot.val(): ', snapshot.val());
  //       const childData: ConversationModel = snapshot.val();
  //       console.log('-----> conversation childData: ', childData);
  //       childData.uid = snapshot.key;
  //       const conversation = that.conversationHandler.completeConversation(childData);
  //       console.log('-----> conversation conversation: ', conversation);
  //       that.conversationSelected = conversation; // childData;
  //       console.log('-----> conversation: ', that.conversationSelected);
  //       that.startConversation();
  //     } else {
  //       // è una nuova conversazione
  //       console.log('-----> conversation childData: NEW');
  //     }
  //   })
  //   .catch((err) => {
  //     console.log('connectConversation Error:', err);
  //   });
  // }

  /**
   * se il messaggio non è vuoto
   * 1 - ripristino l'altezza del box input a quella di default
   * 2 - invio il messaggio
   * 3 - se l'invio è andato a buon fine mi posiziono sull'ultimo messaggio
   */
  sendMessage(msg: string, type: string, metadata?: any) {
    console.log('sendMessage: ');

    let fullname = this.loggedUser.uid;
    if (this.loggedUser.fullname) {
      fullname = this.loggedUser.fullname;
    }
    // const sender = this.loggedUser.uid;
    // let senderFullname = this.loggedUser.fullname; // this.conversationSelected.sender_fullname;
    // if (this.conversationSelected.recipient === this.loggedUser.uid) {
    //   senderFullname = this.conversationSelected.recipient_fullname;
    // }

    console.log('loggedUserID: ', this.loggedUser.uid);

    console.log('conversationWith: ', this.conversationWith);
    console.log('conversationWithFullname: ', this.conversationWithFullname);

    (metadata) ? metadata = metadata : metadata = '';
    console.log('SEND MESSAGE: ', msg, this.messages, this.loggedUser);
    if (msg && msg.trim() !== '' || type !== TYPE_MSG_TEXT) {
      this.conversationHandlerService.sendMessage(
        msg,
        type,
        metadata,
        this.conversationWith,
        this.conversationWithFullname,
        this.loggedUser.uid,
        fullname,
        this.channelType
      );
      this.chatManager.conversationsHandlerService.uidConvSelected = this.conversationWith;
    }
  }

  /** */
  // setWritingMessages(str) {
  //   this.conversationHandler.setWritingMessages(str, this.channelType);
  // }

  // -------------- END MY functions -------------- //


  // -------------- START SUBSCRIBTIONS functions -------------- //
  /**
   * subscriptions list
   */
  initSubscriptions() {
    console.log('||------------> initSubscriptions: ', this.subscriptions);

    const that = this;
    let subscribtion: any;
    let subscribtionKey: string;

    subscribtionKey = 'BSConversationDetail';
    subscribtion = this.subscriptions.find(item => item.key === subscribtionKey);
    if (!subscribtion) {
      subscribtion = this.conversationsHandlerService.BSConversationDetail.subscribe((data: any) => {
        console.log('***** DATAIL subscribeConversationDetail *****', data);
        if (data) {
          that.conversationSelected = data;
          that.selectInfoContentTypeComponent();
        }
      });
      const subscribe = {key: subscribtionKey, value: subscribtion };
      this.subscriptions.push(subscribe);
    }

    subscribtionKey = 'BScontactDetail';
    subscribtion = this.subscriptions.find(item => item.key === subscribtionKey);
    if (!subscribtion) {
      subscribtion = this.contactsService.BScontactDetail.subscribe((contact: UserModel) => {
        console.log('***** DATAIL subscribeBScontactDetail *****BScontactDetail', this.conversationWith, contact);
        if (contact && this.conversationWith === contact.uid ) {
          that.member = contact;
        }
      });
      const subscribe = {key: subscribtionKey, value: subscribtion };
      this.subscriptions.push(subscribe);
    }


    subscribtionKey = 'messageAdded';
    subscribtion = this.subscriptions.find(item => item.key === subscribtionKey);
    if (!subscribtion) {
      console.log('***** add messageAdded *****',  this.conversationHandlerService);
      subscribtion = this.conversationHandlerService.messageAdded.subscribe((msg: any) => {
        console.log('***** DATAIL messageAdded *****', msg);
        if (msg) {
          that.newMessageAdded(msg);
        }
      });
      const subscribe = {key: subscribtionKey, value: subscribtion };
      this.subscriptions.push(subscribe);
    }

    subscribtionKey = 'messageChanged';
    subscribtion = this.subscriptions.find(item => item.key === subscribtionKey);
    if (!subscribtion) {
      subscribtion = this.conversationHandlerService.messageChanged.subscribe((msg: any) => {
        // console.log('***** DATAIL messageChanged *****', msg);
      });
      const subscribe = {key: subscribtionKey, value: subscribtion };
      this.subscriptions.push(subscribe);
    }


    subscribtionKey = 'messageRemoved';
    subscribtion = this.subscriptions.find(item => item.key === subscribtionKey);
    if (!subscribtion) {
      subscribtion = this.conversationHandlerService.messageRemoved.subscribe((messageId: any) => {
        // console.log('***** DATAIL messageRemoved *****', messageId);
      });
      const subscribe = {key: subscribtionKey, value: subscribtion };
      this.subscriptions.push(subscribe);
    }


  }

  /**
   * addEventsKeyboard
   */
  addEventsKeyboard() {
    window.addEventListener('keyboardWillShow', () => {
      console.log('Keyboard will Show');
    });
    window.addEventListener('keyboardDidShow', () => {
      console.log('Keyboard is Shown');
    });
    window.addEventListener('keyboardWillHide', () => {
      console.log('Keyboard will Hide');
    });
    window.addEventListener('keyboardDidHide', () => {
      console.log('Keyboard is Hidden');
    });
  }

  /**
   * unsubscribe all subscribe events
   */
  unsubescribeAll() {
    console.log('||------------> unsubescribeAll: ', this.subscriptions);
    this.subscriptions.forEach(subscription => {
      subscription.value.unsubscribe(); // vedere come fare l'unsubscribe!!!!
    });
    this.subscriptions = [];

    // https://www.w3schools.com/jsref/met_element_removeeventlistener.asp
    window.removeEventListener('keyboardWillShow', null);
    window.removeEventListener('keyboardDidShow', null);
    window.removeEventListener('keyboardWillHide', null);
    window.removeEventListener('keyboardDidHide', null);
    // this.conversationHandlerService.dispose();
  }
  // -------------- END SUBSCRIBTIONS functions -------------- //


  // -------------- START OUTPUT functions -------------- //
  logScrollStart(event: any) {
    // console.log('logScrollStart : When Scroll Starts', event);
  }

  logScrolling(event: any) {
    // console.log('logScrolling : When Scrolling', event);
  }

  logScrollEnd(event: any) {
    // console.log('logScrollEnd : When Scroll Ends', event);
  }




  /**
   * detectBottom
   */
  async detectBottom() {
    const scrollElement = await this.ionContentChatArea.getScrollElement();
    console.log('detectBottom');
    // console.log('scrollElement', scrollElement);
    // console.log('scrollHeight', scrollElement.scrollHeight);
    // console.log('clientHeight', scrollElement.clientHeight);
    // console.log('scrollElement.scrollTop', scrollElement.scrollTop);
    // console.log('scrollElement.scrollHeight - scrollElement.clientHeight', (scrollElement.scrollHeight - scrollElement.clientHeight));
    if (scrollElement.scrollTop < scrollElement.scrollHeight - scrollElement.clientHeight ) {
      this.showButtonToBottom = true;
    } else {
      this.showButtonToBottom = false;
      this.NUM_BADGES = 0;
      this.conversationsHandlerService.readAllMessages.next(this.conversationWith);
    }
  }


  /** */
  returnChangeTextArea(e: any) {
    try {
      let height: number = e.offsetHeight;
      if (height < 50 ) {
        height = 50;
      }
      this.heightMessageTextArea = height.toString(); //e.target.scrollHeight + 20;
      const message = e.msg; // e.detail.value;
      // console.log('------------> returnChangeTextArea', this.heightMessageTextArea);
      // console.log('------------> returnChangeTextArea', e.detail.value);

      // console.log('------------> returnChangeTextArea loggedUser uid:', this.loggedUser.uid);
      // console.log('------------> returnChangeTextArea loggedUser firstname:', this.loggedUser.firstname);
      // console.log('------------> returnChangeTextArea conversationSelected uid:', this.conversationWith);
      // console.log('------------> returnChangeTextArea channelType:', this.channelType);
      let idCurrentUser = '';
      let userFullname = '';

      // serve x mantenere la compatibilità con le vecchie chat
      // if (this.channelType === TYPE_DIRECT) {
      //   userId = this.loggedUser.uid;
      // }
      idCurrentUser = this.loggedUser.uid;
      // -----------------//
      if (this.loggedUser.firstname && this.loggedUser.firstname !== undefined) {
        userFullname = this.loggedUser.firstname;
      }
      this.typingService.setTyping(this.conversationWith, message, idCurrentUser, userFullname);
      // const elTextArea = this.rowTextArea['el'];
      // this.heightMessageTextArea = elTextArea.offsetHeight;
    } catch (err) {
      console.log('error: ', err);
    }
  }

  /** */
  returnSendMessage(e: any) {
    console.log('returnSendMessage::: ', e);
    try {
      const message = e.message;
      const type = e.type;
      this.sendMessage(message, type);
    } catch (err) {
      console.log('error: ', err);
    }
  }

  // -------------- END OUTPUT functions -------------- //


  // -------------- START CLICK functions -------------- //
  /** */
  returnOpenCloseInfoConversation(openInfoConversation: boolean) {
    console.log('returnOpenCloseInfoConversation **************', openInfoConversation);
    this.resizeTextArea();
    this.openInfoMessage = false;
    this.openInfoConversation = openInfoConversation;
  }

  /** */
  // pushPage(pageName: string ) {
  //   this.router.navigateByUrl(pageName);
  // }
  // -------------- END CLICK functions -------------- //



  // -------------- START SCROLL/RESIZE functions -------------- //
  /** */
  resizeTextArea() {
    try {
      const elTextArea = this.rowTextArea['el'];
      const that = this;
      setTimeout( () => {
        const textArea = elTextArea.getElementsByTagName('ion-textarea')[0];
        console.log('messageTextArea.ngAfterViewInit ', textArea);
        const txtValue = textArea.value;
        textArea.value = ' ';
        textArea.value = txtValue;
      }, 0);
      setTimeout( () => {
        console.log('text_area.nativeElement ', elTextArea.offsetHeight);
        that.heightMessageTextArea = elTextArea.offsetHeight;
      }, 100);
    } catch (err) {
      console.log('error: ', err);
    }
  }


  /**
   * newMessageAdded 
   * @param message
   */
  newMessageAdded(message: MessageModel) {
      console.log('newMessageAdded:');
      message.text = this.linkifyService.linkify(message.text, this.linkifyOptions);
      if (message) {
        console.log('newMessageAdded', message);
        console.log('message.isSender', message.isSender);
        console.log('message.status', message.status);
        if (message.isSender) {
          console.log('message message.isSender', this.ionContentChatArea);
          this.scrollBottom(0);
          this.detectBottom();
        } else {
          if (message.status && message.status < 200 ) {
            console.log('message.status < 200');
            this.NUM_BADGES++;
            this.showButtonToBottom = true;
          } else {
            console.log('message.status >= 200');
            this.scrollBottom(0);
            this.detectBottom();
          }
        }
      }
  }


  /**
   * scrollBottom
   * @param time
   */
  private scrollBottom(time: number) {
    setTimeout( () => {
      // this.showButtonToBottom = false;
      this.showIonContent = true;
      // console.log('scrollBottom ---> ', this.ionContentChatArea);
      if (this.ionContentChatArea) {
        // this.showButtonToBottom = false;
        // this.NUM_BADGES = 0;
        // this.conversationsHandlerService.readAllMessages.next(this.conversationWith);
        this.ionContentChatArea.scrollToBottom(time);
        // nota: se elimino il settimeout lo scrollToBottom non viene richiamato!!!!!
      }
    }, 0);
  }

  /**
   * Scroll to bottom of page after a short delay.
   */
  public actionScrollBottom() {
    console.log('actionScrollBottom ---> ', this.ionContentChatArea);
    // const that = this;
    // this.showButtonToBottom = false;
    // this.NUM_BADGES = 0;
    setTimeout( () => {
      this.ionContentChatArea.scrollToBottom(5);
      // this.conversationsHandlerService.readAllMessages.next(this.conversationWith);
    }, 0);
  }

  /**
   * Scroll to top of the page after a short delay.
   */
  scrollTop() {
    console.log('scrollTop');
    this.ionContentChatArea.scrollToTop(100);
  }

  /** */
  setHeightTextArea() {
    try {
      // tslint:disable-next-line: no-string-literal
      this.heightMessageTextArea = this.rowTextArea['el'].offsetHeight;
    } catch (e) {
      this.heightMessageTextArea = '50';
    }
  }
  // -------------- END SCROLL/RESIZE functions -------------- //

}
// END ALL //