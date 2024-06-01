/**
 * @callback OnClickCallback
 * @param {MouseEvent} ev - Mouse event
 */

/**
 * @callback OnOpenCallback
 * @param {MouseEvent} ev - Mouse event
 */

/**
 * @callback OnCloseCallback
 * @param {MouseEvent} ev - Mouse event
 */

/**
 * @callback OnChangeCallback
 * @param {Event} ev - Change event
 */

/**
 * @typedef Checkbox
 * @property {string} id - ID of the checkbox
 * @property {boolean} [checked] - Whether the checkbox is default checked or not
 * @property {boolean} [disabled] - Whether the checkbox is disabled or not
 * @property {OnChangeCallback} [onChange] - Function to be called when the checkbox is clicked
 */

/**
 * @typedef MenuItem - Menu item to be displayed in the context menu
 * @property {string} label - Label to be displayed in the context menu
 * @property {OnClickCallback} [onClick] - Function to be called when the menu item is clicked
 * @property {boolean} [disabled] - Whether the menu item is disabled or not
 * @property {boolean} [divider] - Whether the menu item is a divider or not
 * @property {MenuItem[]} [submenu] - Submenu items to be displayed when the menu item is hovered
 * @property {Checkbox} [checkbox] - Checkbox to be displayed in the menu item
 * @property {string} [icon] - Icon to be displayed in the menu item
 */

/**
 * @typedef Options
 * @property {MenuItem[]} menuItems - Menu items to be displayed in the context menu
 * @property {OnOpenCallback} [onOpen] - Function to be called when the context menu is opened
 * @property {OnCloseCallback} [onClose] - Function to be called when the context menu is closed
 */

export class ContextMenu {
  /**
   *
   * @param {Options} options
   */
  constructor(options) {
    this._listeners = {};
    this._options = options;
    this._contextMenuEl = document.createElement("div");
    this._contextMenuEl.id = "context-menu";
  }

  /**
   * Handles the DOM manipulation required to display the context menu
   * @param {MenuItem[]} menuItems
   */
  handleDOMManipulation(menuItems) {
    document.body.appendChild(this._contextMenuEl);

    // Append Menu Items to the context menu
    const menuItemsEl = this._createMenu(menuItems);
    this._contextMenuEl.appendChild(menuItemsEl);

    this._listeners.open = window.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.show(e);
    });
  }

  /**
   * @param {MenuItem[]} menuItems
   */
  _createMenu(menuItems) {
    const menuItemsEl = document.createElement("ul");
    menuItemsEl.classList.add("menu-items");
    menuItems.forEach((menuItem) => {
      const menuItemEl = this._createMenuItem(menuItem);
      menuItemsEl.appendChild(menuItemEl);
    });
    return menuItemsEl;
  }

  /**
   * @param {MenuItem} menuItem
   */
  _createMenuItem(menuItem) {
    const menuItemEl = document.createElement("li");
    menuItemEl.classList.add("menu-item");
    if (menuItem.disabled) menuItemEl.classList.add("disabled");

    // Disable mousedown and contextmenu events on the menu item by default
    menuItemEl.addEventListener("mousedown", (ev) => {
      ev.stopPropagation();
    });
    menuItemEl.addEventListener("contextmenu", (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
    });

    if (menuItem.checkbox !== undefined) {
      // Generate a radio button
      menuItemEl.classList.add("checkbox");
      const radioDetails = menuItem.checkbox;
      const radioEl = document.createElement("input");
      radioEl.id = radioDetails.id;
      radioEl.type = "checkbox";
      if (radioDetails.checked !== undefined)
        radioEl.defaultChecked = radioDetails.checked;
      if (radioDetails.disabled !== undefined)
        radioEl.disabled = radioDetails.disabled;
      radioEl.addEventListener("change", (ev) => {
        if (radioDetails.onChange) radioDetails.onChange(ev);
      });
      const radioLabelEl = document.createElement("label");
      radioLabelEl.innerText = menuItem.label;
      radioLabelEl.htmlFor = radioEl.id;
      menuItemEl.appendChild(radioEl);
      menuItemEl.appendChild(radioLabelEl);
    } else if (menuItem.divider !== undefined) {
      // Generate a divider
      menuItemEl.classList.add("divider");
    } else if (menuItem.submenu !== undefined) {
      // Generate a submenu
      menuItemEl.classList.add("submenu-trigger");
      const submenuEl = this._createMenu(menuItem.submenu);
      const label = document.createElement("span");
      label.innerText = menuItem.label;
      label.classList.add("label");
      menuItemEl.appendChild(label);
      submenuEl.classList.add("sub-menu");
      menuItemEl.appendChild(submenuEl);
    } else {
      // Generate a normal menu item
      const menuButtonEl = document.createElement("button");
      menuButtonEl.innerText = menuItem.label;
      if (menuItem.disabled) menuButtonEl.disabled = menuItem.disabled;
      menuButtonEl.addEventListener("mouseup", (ev) => {
        if (ev.button !== 0) return;
        console.log(ev.currentTarget);
        if (menuItem.onClick) menuItem.onClick(ev);
        this.hide(ev);
      });
      menuItemEl.appendChild(menuButtonEl);
    }

    // TODO: Add support to icons (position left and right)

    return menuItemEl;
  }

  /**
   * @param {MouseEvent} ev
   */
  show(ev) {
    const x = ev.clientX;
    const y = ev.clientY;
    this._contextMenuEl.classList.add("active");
    this._contextMenuEl.style.left = `${x}px`;
    this._contextMenuEl.style.top = `${y}px`;

    this._listeners.close = window.addEventListener("mousedown", (e) => {
      console.log(e.currentTarget);
      this.hide(e);
    });
    this._onOpen && this._onOpen(ev);
  }

  /**
   * @param {MouseEvent} ev
   */
  hide(ev) {
    this._contextMenuEl.classList.remove("active");
    window.removeEventListener("mousedown", this._listeners.close);
    this._listeners.close = null;
    this._onClose && this._onClose(ev);
  }

  mount() {
    this._onOpen = this._options.onOpen;
    this._onClose = this._options.onClose;
    this.handleDOMManipulation(this._options.menuItems);
  }

  get contextMenuElement() {
    return this._contextMenuEl;
  }
}

const contextMenu = new ContextMenu({
  menuItems: [
    {
      label: "Copy",
      onClick: () => {
        console.log("Copy");
      }
    },
    {
      label: "Paste",
      onClick: () => {
        console.log("Paste");
      }
    },
    {
      label: "More Options",
      submenu: [
        {
          label: "Paste",
          onClick: () => {
            console.log("Paste");
          }
        },
        {
          label: "Even More Options",
          submenu: [
            {
              label: "Copy",
              onClick: () => {
                console.log("Copy");
              }
            },
            {
              label: "DIVIDER",
              divider: true
            },
            {
              label: "CHECKBOX",
              checkbox: {
                id: "checkbox",
                checked: true,
                onChange: () => {
                  console.log("Checkbox");
                }
              },
              onClick: () => {
                console.log("Checkbox");
              }
            },
            {
              label: "Is Disabled",
              onClick: () => {
                console.log("disabled");
              },
              disabled: true
            }
          ]
        }
      ],
      onClick: () => {
        console.log("Paste");
      }
    }
  ]
});

contextMenu.mount();
