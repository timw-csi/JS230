class contactManager {
  
  constructor(url) {
    this.url = url;
    this.contacts = null;

    this.welcomeTemplate = null;
    this.createContactTemplate = null;
    this.editContactTemplate = null;

    this.body = document.querySelector('#topContainer');
    this.search = document.querySelector('#searchBar');
    this.defaultAddButton = document.querySelector('#defaultAdd');
    this.homeButton = document.querySelector('#home');
    this.welcomeContainer = null;
    this.addCreateMenu = null;
    this.editMenu = null;
    this.cancelCreateButton = null;
  
    this.valueChanged = this.debounce(this.valueChanged.bind(this), 300);
    this.registerTemplates();
    this.initializer();
  }

  registerTemplates() {
    Handlebars.registerPartial('contact', document.querySelector('#contactPartial').innerHTML);
    
    this.welcomeTemplate = Handlebars.compile(document.querySelector('#defaultWelcome').innerHTML);
    this.createContactTemplate = Handlebars.compile(document.querySelector('#soloContact').innerHTML);
    this.editContactTemplate = Handlebars.compile(document.querySelector('#soloContact').innerHTML);
  }

  async initializer() {
    await this.fetchContacts();
    this.clearSearch();
    this.displayWelcomePage();
    this.createAddMenu();
    this.bindMethods();
  }

  // used lite parameter for cases where we want 
  // new home page without call to database for contacts
  async refresh(lite) {
    if (!lite) {
      await this.fetchContacts();
    }
    this.clearSearch();
    this.displayWelcomePage();
    this.bindMethods();
  }


  clearSearch() {
    this.search.value = '';
  }

  async fetchContacts() {
    try {
      let response = await fetch(this.url);
      if (!response.ok) {
        let errorMsg = await response.text();
        throw new Error(errorMsg);
      }
      let contacts = await response.json();
      this.contacts = this.formatTags(contacts);
    } catch(error) {
      console.error(error);
    }  
  }

  displayWelcomePage(matchingContacts) {
    this.welcomeContainer = document.querySelector('#welcomeContainer');
    this.welcomeContainer.innerHTML = '';
    if (matchingContacts) {
      this.welcomeContainer.insertAdjacentHTML('afterbegin', this.welcomeTemplate({contacts: matchingContacts}));
    } else {
    this.welcomeContainer.insertAdjacentHTML('afterbegin', this.welcomeTemplate({contacts: this.contacts}));
    }
    
    this.displayDefaultHome();
  } 

  createAddMenu() {
    $(this.body).append($(this.createContactTemplate({action: 'Create'})).css('display', 'none'));
    
    this.addCreateMenu = document.getElementById('contactFormCreate');
    this.cancelCreateButton = document.getElementById('cancelCreate');
  }

  valueChanged() {
    let value = this.search.value;

    if (value.length > 0) {
      let matchingContacts = this.filterContactsBySearch(value);
      this.displayWelcomePage(matchingContacts);
    } else {
      this.displayWelcomePage();
    }
  }

  filterContactsBySearch(value) {
    return this.contacts.filter(contact => {
      let name = contact.full_name;
      let regex = new RegExp(value, 'ig');
      return name.match(regex);
    })
  }

  debounce (func, delay) {
    let timeout;
    return (...args) => {
      if (timeout) { clearTimeout(timeout) }
      timeout = setTimeout(() => func.apply(null, args), delay);
    };
  }
  

  formatTags(contacts) {
    return contacts.map(soloContact => {
      if (!soloContact.tags) return soloContact;
      else {
        soloContact.tags = soloContact.tags.split(', ');
        return soloContact
      }                                          
    })
  }

  filterContactsByTag(value) {
    return this.contacts.filter(contact => {
      return contact.tags.includes(value);
    })
  }

  async createEditMenu(id) {
    if (this.editMenu) {
      this.editMenu.remove();
    }

    let contact = await this.fetchSoloContact(id);
    contact.action = 'Edit';
    
    $(this.body).append($(this.editContactTemplate(contact)).css('display', 'none'));
    
    this.editMenu = document.getElementById('contactFormEdit');
    this.editMenu.addEventListener('submit', this.editContact.bind(this));
   
    let cancelEditButton = document.getElementById('cancelEdit');
    cancelEditButton.addEventListener('click', this.cancelHandler.bind(this));
    
    this.displayEditMenu();
  }

  async editContact(event) {
    event.preventDefault();
    
    let form = event.currentTarget;
    let id = form.dataset.objectId;
    
    let json = JSON.stringify(Object.fromEntries(new FormData(form)));
    let requestOptions = {
      method: 'PUT',
      headers: {
        "Content-Type": 'application/json'
      },
      body: json
    };

    try {
      let response = await fetch(this.url + String(id), requestOptions);
      if (!response.ok) {
        let errorMsg = await response.text();
        throw new Error(errorMsg);
      } 
      console.log('Successfully updated user info.');
      this.refresh();
    } catch(error) {
      console.log(error);
    }
  }

  async fetchSoloContact(id) {
    try {
      let response = await fetch(this.url + String(id));
      if (!response.ok) {
        let errorMsg = await response.text();
        throw new Error(errorMsg);
      }  
      let contact = await response.json();
      return contact;
    } catch(error) {
      console.error(error);
    }  
  }

  async addContact(event) {
    event.preventDefault();

    let form = event.currentTarget;
    let data = new FormData(form);
    let json = JSON.stringify(Object.fromEntries(data));

    let requestOptions = {
      method: 'POST',
      headers: {
        "Content-Type": 'application/json'
      },
      body: json
    };

    try {
      let response = await fetch(this.url, requestOptions);
      if (!response.ok) {
        let errorMsg = await response.text();
        throw new Error(errorMsg);
      } 
      form.reset();
      this.refresh();
    } catch(error) {
      console.log(error);
    }
  }

  async deleteContact(id) {
    let data = JSON.stringify({'id': id});
    let requestOptions = {
      method: 'DELETE',
      headers: {
        "Content-Type": 'application/json'
      },
      body: data,
    };

    try {
      let response = await fetch(this.url + String(id), requestOptions);
      if (!response.ok) {
        let errorMsg = await response.text();
        throw new Error(errorMsg);
      } 
      console.log('Contact deleted.');
      this.refresh();
    } catch(error) {
      console.error(error);
    }
  }

  displayAddMenu() {
    $(this.addCreateMenu).show();
    $(this.welcomeContainer).hide();
    $(this.editMenu).hide()
  }

  displayDefaultHome() {
    $(this.welcomeContainer).show();
    $(this.addCreateMenu).hide()
    $(this.editMenu).hide()
  }

  displayEditMenu() {
    $(this.editMenu).show()
    $(this.addCreateMenu).hide()
    $(this.welcomeContainer).hide();
  }


  bindMethods() {
    let $modifyLinks = $('.modifyLinks');

    // handles default header 'Add Contact' button being clicked, displays Add Contact form
    $(this.defaultAddButton).off().on('click', this.addMenuHandler.bind(this));

    //Home page button
    $(this.homeButton).off().on('click', this.homeHandler.bind(this));

    // handles Add Contact form being submitted
    $(this.addCreateMenu).off().on('submit', this.addContact.bind(this))

    // handles clicking 'Cancel' on displayed Add Contact form
    $(this.cancelCreateButton).off().on('click', this.cancelHandler.bind(this));

    // handles clicking 'Edit' or 'Delete' for individual contact
    $modifyLinks.off().on('click', 'a', this.modifyHandler.bind(this));

    // // SEARCH BAR interactivity
    $(this.search).off().on('input', this.valueChanged)

    //Tag link click
    $(this.welcomeContainer).off().on('click', 'a', this.tagLinkHandler.bind(this));
  }
  
  addMenuHandler(event) {
    event.preventDefault();
    this.displayAddMenu();
  }

  cancelHandler(event) {
    event.preventDefault();
    this.displayWelcomePage();
    this.bindMethods();
  }

  homeHandler(event) {
    event.preventDefault();
    this.refresh('lite');
    // this.clearSearch();
    // this.displayWelcomePage();
    // this.bindMethods();
  }

  tagLinkHandler(event) {
    event.preventDefault();

    let link = event.target;
    let tag = link.dataset.tag;
    let matchingContacts = this.filterContactsByTag(tag);
    this.displayWelcomePage(matchingContacts);
  }

  modifyHandler(event) {
    event.preventDefault();
    let target = event.target;
    let method = target.dataset.method;
    let id = target.dataset.objectId;
    
    switch (method) {
      case 'edit':
        // bring up edit page with relevant info filled in from current contact
        this.createEditMenu(id);
        break;
      case 'delete':
        this.deleteContact(id);
        break;
    };
  }
} 

document.addEventListener('DOMContentLoaded', () => {
  let CM = new contactManager("http://localhost:3000/api/contacts/");
});