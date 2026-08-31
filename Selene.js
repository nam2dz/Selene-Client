// ==UserScript==
// @name         Selene by Nam2Dz
// @namespace    Nam2Dz
// @version      1.0
// @description   made in vietnam :D
// @author       Nam2Dz
// @match        https://bloxd.io/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bloxd.io
// @grant        none
// ==/UserScript==
const text = document.createElement("div");

text.textContent = "Selene by Nam2Dz";

text.style.position = "fixed";
text.style.top = "8px";
text.style.left = "10px";
text.style.color = "#2F8CFF";
text.style.fontSize = "14px";
text.style.fontWeight = "bold";
text.style.fontFamily = "Arial, sans-serif";
text.style.textShadow = "1px 1px 2px #06111F";
text.style.zIndex = "999999";

document.body.appendChild(text);

(function() {
    'use strict';

    const gameState = {
        noa: null,
        bloxd: null,
        physics: null,
        world: null,
        rendering: null,
        playerData: null,
        entityList: null,
        impKey: null,
        injected: false
    };
    const stats = {
        fpsCount: 0,
        lastFpsTime: performance.now(),
        currentFps: 0,
        lClicks: [],
        rClicks: []
    };
    const utils = {
        keys(obj) {
            var result = []
              , index = 0;
            for (var key in obj)
                obj != null && (result[index] = key,
                index++);
            return result;
        },
        values(obj) {
            var index = 0;
            var keys = this.keys(obj)
              , result = []
              , i = 0
              , j = 0;
            while (i < keys.length) {
                var key = keys[i]
                  , value = obj[key];
                result[j] = value,
                j++,
                i++;
            }
            return result;
        },
        assign(target, ...sources) {
            let result = Object(target);
            var index = 0;
            let i = 0;
            while (i < sources.length) {
                let source = sources[i];
                if (source != null) {
                    for (let key in source)
                        result[key] = source[key];
                }
                i++;
            }
            return result;
        },
        entries(obj) {
            var keys = this.keys(obj)
              , result = [];
            var index = 0;
            while (index < keys.length) {
                result[index] = [keys[index], obj[keys[index]]];
                index++;
            }
            return result;
        }
    };
    const client = {
        ready: false,
        modules: {}
    };
    const gameUtils = {
        getPosition(entityId) {
            return gameState.noa.entities.getState(entityId, 'position')?.position;
        },
        getPhysicsBody(entityId) {
            return gameState.noa.entities.getState(entityId, 'physics')?.body;
        },
        getPhysState(entityId) {
            return gameState.noa.entities.getState(entityId, 'movement');
        },
        getMoveState(entityId) {
            if (entityId === 1 && gameState.moveState) {
                return gameState.moveState;
            }
            return gameState.noa.entities.getState(entityId, 'movement');
        },
        get registry() {
            return utils.values(gameState.noa)[17];
        },
        get getBlockSolidity() {
            return utils.values(this.registry)[5];
        },
        get getBlockID() {
            return gameState.noa[Object.getOwnPropertyNames(gameState.noa.constructor.prototype)[4]].bind(gameState.noa);
        },
        get getHeldItem() {
            return Object.values(gameState.noa.entities).find(func => {
                if (typeof func !== 'function')
                    return false;
                if (func.length !== 1)
                    return false;
                const str = Function.prototype.toString.call(func);
                return str.includes(').') && str.length < 30 && !str.includes(').op');
            }
            );
        },
        safeGetHeldItem(entityId) {
            let result;
            try {
                result = this.getHeldItem(entityId);
            } catch {}
            return result;
        },
        get playerList() {
            return utils.values(gameState.noa.bloxd.getPlayerIds()).filter(id => id !== 1 && this.safeGetHeldItem(id)).map(id => parseInt(id));
        },
        get entityList() {
            return utils.values(gameState.noa.bloxd.getEntityIds()).filter(id => id !== 1 && this.safeGetHeldItem(id)).map(id => parseInt(id));
        },
        get doAttack() {
            let heldItem = this.safeGetHeldItem(1)
              , breakingItem = heldItem?.breakingItem;
            for (let item of [breakingItem, heldItem]) {
                if (item) {
                    let props = Object.getOwnPropertyNames(Object.getPrototypeOf(item));
                    let attackMethod = props.find(k => item[k]?.length == 3 && /canAttack/.test(item[k]));
                    let getItemMethod = props.find(k => item[k]?.length == 2 && /getItemAtSelectedSlot/.test(item[k]));
                    if (attackMethod && getItemMethod) {
                        return (v, id, m) => {
                            item[attackMethod].bind(item)(v, id, m);
                            return item[getItemMethod].bind(item)(v, id);
                        }
                    }
                }
            }
        },
        getPlayerEntity() {
            if (!gameState.injected || !gameState.noa.entities[gameState.impKey]) {
                return null;
            }
            const entity = gameState.noa.entities[gameState.impKey];
            return Object.values(entity || {}).find(val => val?.list?.[0]?._blockItem)?.list?.[0] || null;
        },
        placeBlock(position) {
            const blockItem = this.getPlayerEntity()?._blockItem;
            if (!blockItem?.placeBlock)
                return;
            const key1 = Object.keys(blockItem)[0];
            const obj1 = Object.values(blockItem)[0];
            if (!obj1)
                return;
            const key2 = Object.keys(obj1)[25];
            const obj2 = obj1[key2];
            const createProxy = pos => new Proxy({},{
                get: (target, prop) => {
                    if (prop === key1) {
                        return new Proxy(obj1,{
                            get: (target, p) => p === key2 ? {
                                ...obj2,
                                position: pos
                            } : obj1[p]
                        });
                    }
                    if (prop === 'checkTargetedBlockCanBePlacedOver') {
                        return () => true;
                    }
                    return typeof blockItem[prop] === 'function' ? blockItem[prop].bind(blockItem) : blockItem[prop];
                }
            });
            blockItem.placeBlock.call(createProxy(position));
        },
        getBlockName(id) {
            const blocks = gameState.Props?.blocksClient;
            return blocks?.[id]?.name || 'Không khí';
        }
    };
    let moduleLoader = null;
    const originalBind = Function.prototype.bind;

    function setupTemporaryBindHijack() {
        if (moduleLoader || gameState.injected)
            return;

        Function.prototype.bind = function(context) {
            if (typeof context === 'function' && context.m) {
                moduleLoader = context;
                Function.prototype.bind = originalBind;

                const attemptInject = () => {
                    if (!gameState.injected) {
                        inject();
                        setTimeout(attemptInject, 300);
                    }
                }
                ;
                attemptInject();

                return () => ({
                    then: () => ({
                        then: () => {}
                    })
                });
            }
            return originalBind.apply(this, arguments);
        }
        ;
    }

    setupTemporaryBindHijack();

    if (typeof window.loadVConsole === 'function') {
        window.loadVConsole();
    }
    function inject() {
        try {
            if (!moduleLoader)
                return false;
            const modules = moduleLoader.m;
            let moduleObj = null;
            EzAD: for (const key in modules) {
                if (Function.prototype.toString.call(modules[key]).includes('nonBlocksClient:')) {
                    moduleObj = moduleLoader(key);
                    break EzAD;
                }
            }
            if (!moduleObj)
                return false;
            const propsObj = utils.values(moduleObj).find(val => typeof val === 'object');
            if (!propsObj)
                return false;
            const noaObj = utils.values(propsObj).find(val => val?.entities);
            if (!noaObj)
                return false;
            const noaValues = utils.values(noaObj);
            gameState.noa = noaObj;
            gameState.bloxd = noaObj.bloxd;
            gameState.physics = noaObj.physics;
            gameState.world = noaValues[11];
            gameState.rendering = noaValues[12];
            gameState.playerData = noaValues[29];
            gameState.entityList = noaValues[30];
            gameState.Props = propsObj;
            let sceneObj = utils.values(gameState.rendering).find(val => val?.meshes?.[0]);
            if (sceneObj) {
                let meshObj = sceneObj.meshes[0];
                gameState.Lion = {
                    scene: sceneObj,
                    Mesh: meshObj.constructor,
                    Texture: sceneObj.environmentBRDFTexture.constructor,
                    StandardMaterial: meshObj.material.constructor,
                    Color3: meshObj.material.diffuseColor.constructor
                };
            }
            const entitiesVal = utils.values(gameState.noa.entities)[2];
            gameState.impKey = utils.entries(gameState.noa.entities).find( ([key,val]) => val === entitiesVal)?.[0];
            client.ready = true;
            gameState.injected = true;
            if (ui) {
                ui.notify('Sẵn sàng (Phím Shift phải dùng để bật/tắt menu.)', '#36A3FF');
            }
            enableModules();
            return true;
        } catch (err) {
            return false;
        }
    }
    let injected = false;
    function setupInjectionObserver() {
        const checkInjection = () => {
            const elements = document.querySelectorAll(".FullyFancyText, .ButtonBody");
            let found = false;
            for (let i = 0; i < elements.length; i++) {
                const el = elements[i];
                const text = el.textContent.toLowerCase();
                if (text.includes("Vào game") || text.includes("Ở lại trong phòng") || text.includes("Nhấp vào bất kỳ đâu") || text.includes("enter game") || text.includes("stay in lobby") || text.includes("press anywhere")) {
                    const style = window.getComputedStyle(el);
                    if (el.offsetWidth > 0 && el.offsetHeight > 0 && style.visibility !== "hidden" && style.display !== "none") {
                        found = true;
                        break;
                    }
                }
            }
            if (found) {
                if (!moduleLoader && !gameState.injected) {
                    setupTemporaryBindHijack();
                }

                if (!injected && inject()) {
                    injected = true;
                    console.log("BoneClient: Tiêm thành công");
                }
            } else {
                injected = false;
            }
        }
        ;
        const observer = new MutationObserver( () => checkInjection());
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true
        });
        checkInjection();
    }
    function enableModules() {
        utils.values(client.modules).forEach(module => {
            if (module.enabled) {
                module.onEnable?.();
            }
        }
        );
    }
    const ui = {
        panels: {},
        visible: false,
        notifyBox: null,
        overlay: null,
        watermark: null,
        arrayList: null,
        bindingModule: null,
        shadowHost: null,
        shadowRoot: null,
        menuButton: null,
        categories: ['Chiến đấu', 'Di chuyển', 'Hiển thị', 'Thế giới', 'HUD'],
        init() {
            this.createShadowHost();
            this.injectStyles();
            this.createOverlay();
            this.createNotifyBox();
            this.createPanels();
            this.createHUD();
            this.setupEvents();
            this.render();
        },
        injectStyles() {
            const style = document.createElement('style');
            style.innerHTML = `
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
                :host {
                    --primary: #2F8CFF;
                    --bg-panel: rgba(8, 18, 32, 0.97);
                    --text: #FFFFFF;
                    --text-secondary: #A9D2FF;
                    --border: rgba(47, 140, 255, 0.45);
                    --panel-radius: 6px;
                    --font-main: 'Outfit', sans-serif;
                    --switch-bg: rgba(0, 0, 0, 0.2);
                    --switch-active: #FFFFFF;
                }
                .bone-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.3); backdrop-filter: none; z-index: 9999; opacity: 0; pointer-events: none; transition: 0.3s; }
                .bone-overlay.visible { opacity: 1; pointer-events: auto; }
                .bone-panel { position: fixed; width: 190px; background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--panel-radius); display: flex; flex-direction: column; z-index: 10000; color: var(--text); font-family: var(--font-main); opacity: 0; transform: scale(0.96) translateY(10px); pointer-events: none; transition: 0.2s, background-color 0.3s, border-color 0.3s, color 0.3s; box-shadow: 0 10px 30px rgba(0,0,0,0.5); overflow: hidden; }
                .bone-panel.visible { opacity: 1; transform: scale(1) translateY(0); pointer-events: auto; }
                .bone-panel-header { padding: 10px 12px; background: rgba(0,0,0,0.2); display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 10px; text-transform: uppercase; cursor: move; letter-spacing: 1px; border-bottom: 1px solid var(--border); color: var(--text-secondary); transition: background-color 0.3s, border-color 0.3s, color 0.3s; }
                .bone-panel-arrow { width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid var(--text-secondary); transition: transform 0.2s ease; cursor: pointer; }
                .bone-panel-arrow.open { transform: rotate(180deg); }
                .bone-module { padding: 8px 12px; margin: 4px 6px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: all 0.15s ease; font-size: 13px; color: var(--text-secondary); background: transparent; }
                .bone-module:hover { color: var(--text); background: rgba(255,255,255,0.05); }
                .bone-module.active { color: var(--switch-active); font-weight: 700; background: rgba(255,255,255,0.15); transform: scale(1.02); box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
                .bone-module-expand { font-size: 14px; color: var(--text-secondary); opacity: 0.6; margin-left: 6px; transition: transform 0.2s, color 0.2s, color 0.3s; }
                .bone-module-expand.open { transform: rotate(90deg); color: var(--primary); opacity: 1; }
                .bone-module:hover .bone-module-expand { opacity: 1; }
                .bone-module-keybind { font-size: 9px; color: var(--text-secondary); opacity: 0.6; margin-left: auto; text-transform: uppercase; transition: color 0.3s; }
                .bone-module:hover .bone-module-keybind { opacity: 1; }
                .bone-module.binding .bone-module-keybind { color: var(--primary); opacity: 1; font-weight: 700; }
                .bone-dropdown {
                    background: rgba(0,0,0,0.25); display: flex; flex-direction: column; gap: 8px;
                    max-height: 0; opacity: 0; overflow: hidden; padding: 0 12px;
                    transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease, padding 0.3s ease, background-color 0.3s;
                }
                .bone-dropdown.open {
                    max-height: 400px; opacity: 1; padding: 10px 12px;
                    border-bottom: 1px solid rgba(255,255,255,0.02);
                }
                .bone-setting { display: flex; flex-direction: column; gap: 4px; }
                .bone-setting-label { color: var(--text-secondary); display: flex; justify-content: space-between; font-size: 9px; font-weight: 700; text-transform: uppercase; transition: color 0.3s; }
                .bone-setting-slider { -webkit-appearance: none; width: 100%; height: 2px; background: #17283B; border-radius: 2px; outline: none; margin: 6px 0; }
                .bone-setting-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 10px; height: 10px; border-radius: 50%; background: #eee; cursor: pointer; transition: 0.2s; }
                .bone-setting-slider::-webkit-slider-thumb:hover { transform: scale(1.2); background: var(--primary); }
                .bone-checkbox-wrapper { display: flex; align-items: center; cursor: pointer; }
                .bone-checkbox-wrapper input { position: absolute; opacity: 0; width: 0; height: 0; }
                .bone-checkmark { height: 14px; width: 14px; background-color: #0B1726; border-radius: 3px; border: 1px solid #1B3856; transition: 0.2s, background-color 0.3s, border-color 0.3s; position: relative; }
                .bone-checkbox-wrapper input:checked ~ .bone-checkmark { background-color: var(--primary); border-color: var(--primary); }
                .bone-checkmark:after { content: ""; position: absolute; display: none; left: 4px; top: 1px; width: 3px; height: 6px; border: solid white; border-width: 0 2px 2px 0; transform: rotate(45deg); }
                .bone-checkbox-wrapper input:checked ~ .bone-checkmark:after { display: block; }
                .bone-notify-box {
                    position: fixed; bottom: 25px; right: 25px; z-index: 10001;
                    display: flex; flex-direction: column; align-items: flex-end; gap: 0;
                    font-family: var(--font-main); pointer-events: none;
                }
                .bone-toast-wrapper {
                    overflow: hidden; opacity: 0; max-height: 0; margin-top: 0; transform: translateX(120%);
                    transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease,
                    transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), margin-top 0.3s ease;
                }
                .bone-toast-wrapper.show {
                    opacity: 1; max-height: 60px; margin-top: 10px; transform: translateX(0);
                }
                .bone-toast-wrapper.exit {
                    opacity: 0; max-height: 0; margin-top: 0; transform: translateX(120%);
                }
                .bone-toast {
                    padding: 10px 18px; background: var(--bg-panel); border-radius: 6px; color: #fff; font-size: 12px;
                    border: 1px solid var(--border); border-left: 3px solid var(--primary);
                    box-shadow: 0 5px 15px rgba(0,0,0,0.3); white-space: nowrap;
                }
                .bone-watermark { position: fixed; top: 15px; left: 15px; font-family: var(--font-main); font-size: 20px; font-weight: 700; color: var(--primary); text-shadow: 2px 2px 4px rgba(0,0,0,0.5); z-index: 9998; pointer-events: none; display: none; }
                .bone-categories { position: fixed; top: 45px; left: 15px; display: flex; flex-direction: column; gap: 6px; z-index: 9998; pointer-events: auto; font-family: var(--font-main); }
                .bone-category-btn { padding: 4px 10px; background: rgba(0,0,0,0.3); border-radius: 4px; color: var(--text-secondary); font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.15s ease; text-transform: uppercase; letter-spacing: 0.5px; }
                .bone-category-btn:hover { background: rgba(255,255,255,0.1); color: var(--text); }
                .bone-category-btn.active { background: var(--primary); color: #FFFFFF; }
                .bone-array-list { position: fixed; top: 15px; right: 15px; display: none; flex-direction: column; align-items: flex-end; gap: 0; z-index: 9998; pointer-events: none; font-family: var(--font-main); }
                .bone-array-item-wrapper { overflow: hidden; opacity: 0; max-height: 0; transform: translateX(30px); margin-bottom: 0; transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
                .bone-array-item-wrapper.show { opacity: 1; max-height: 30px; transform: translateX(0); }
                .bone-array-item { background: rgba(5, 13, 24, 0.88); padding: 4px 8px; border-radius: 3px 0 0 3px; border-right: 2px solid var(--primary); color: #fff; font-size: 13px; font-weight: 700; text-align: right; white-space: nowrap; box-shadow: -2px 2px 5px rgba(0,0,0,0.2); }
                .bone-array-list.left-side { align-items: flex-start; }
                .bone-array-list.left-side .bone-array-item-wrapper { transform: translateX(-30px); }
                .bone-array-list.left-side .bone-array-item-wrapper.show { transform: translateX(0); }
                .bone-array-list.left-side .bone-array-item {
                    border-radius: 0 3px 3px 0;
                    border-right: none;
                    border-left: 2px solid var(--primary);
                    text-align: left;
                }
                .bone-target-hud { position: fixed; display: none; z-index: 9998; pointer-events: none; font-family: var(--font-main); }
                .bone-target-hud-inner { background: rgba(5, 13, 24, 0.92); border: 1px solid var(--border); border-radius: 6px; padding: 8px 14px; min-width: 140px; backdrop-filter: blur(6px); box-shadow: 0 4px 16px rgba(0,0,0,0.4); }
                .bone-target-hud-name { color: #fff; font-size: 12px; font-weight: 700; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .bone-target-hud-bar-bg { width: 100%; height: 4px; background: #17283B; border-radius: 2px; overflow: hidden; }
                .bone-target-hud-bar { height: 100%; background: #36A3FF; border-radius: 2px; transition: width 0.15s ease; }
                .bone-target-hud-hp-text { color: var(--text-secondary); font-size: 9px; margin-top: 3px; text-align: right; }
                .bone-hud-info { position: fixed; top: 15px; left: 50%; transform: translateX(-50%); color: #fff; font-size: 14px; font-weight: 700; text-shadow: 1px 1px 2px #000; z-index: 9998; display: none; gap: 15px; background: rgba(0,0,0,0.4); padding: 5px 15px; border-radius: 10px; }
                .bone-keystrokes { position: fixed; top: 100px; left: 15px; z-index: 9998; display: none; flex-direction: column; gap: 4px; }
                .bone-key-row { display: flex; gap: 4px; justify-content: center; }
                .bone-key { width: 30px; height: 30px; background: rgba(5,13,24,0.82); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; border-radius: 4px; transition: 0.1s; border: 1px solid var(--border); font-size: 12px; }
                .bone-key.mouse { width: 47px; flex-direction: column; justify-content: center; gap: 1px; }
                .bone-key.spacebar { width: 98px; height: 18px; }
                .bone-key.active { background: rgba(255, 255, 255, 0.4); transform: scale(0.95); }
                .bone-cps { font-size: 9px; color: #aaa; text-align: center; font-weight: normal; line-height: 1; margin-top: 1px; }
                .bone-menu-button { pointer-events: auto; position: fixed; top: 8px; left: 50%; transform: translateX(-50%); width: 30px; height: 30px; background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 4px; color: #ccc; font-size: 18px; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 10000; user-select: none; transition: 0.15s; }
                .bone-menu-button:hover { background: rgba(0, 0, 0, 0.8); color: #fff; border-color: var(--primary); }
                .bone-menu-button:active { transform: translateX(-50%) scale(0.95); }
                `;
            this.shadowRoot.appendChild(style);
        },
        createShadowHost() {
            this.shadowHost = document.createElement('div');
            this.shadowHost.id = 'bone-shadow-host';
            this.shadowHost.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:9998;pointer-events:none;';
            document.body.appendChild(this.shadowHost);
            this.shadowRoot = this.shadowHost.attachShadow({
                mode: 'open'
            });
        },
        createOverlay() {
            this.overlay = document.createElement('div');
            this.overlay.className = 'bone-overlay';
            this.shadowRoot.appendChild(this.overlay);
        },
        createNotifyBox() {
            this.notifyBox = document.createElement('div');
            this.notifyBox.className = 'bone-notify-box';
            this.shadowRoot.appendChild(this.notifyBox);
        },
        createHUD() {
            this.watermark = document.createElement('div');
            this.watermark.className = 'bone-watermark';
            this.watermark.textContent = 'Selene by Nam2Dz';
            this.shadowRoot.appendChild(this.watermark);

            this.categoriesContainer = document.createElement('div');
            this.categoriesContainer.className = 'bone-categories';
            this.categories.forEach(category => {
                const btn = document.createElement('div');
                btn.className = 'bone-category-btn';
                btn.textContent = category;
                btn.dataset.category = category;
                btn.onclick = () => this.toggleCategory(category);
                this.categoriesContainer.appendChild(btn);
            }
            );
            this.shadowRoot.appendChild(this.categoriesContainer);

            this.arrayList = document.createElement('div');
            this.arrayList.className = 'bone-array-list';
            this.shadowRoot.appendChild(this.arrayList);
            this.hudInfo = document.createElement('div');
            this.hudInfo.className = 'bone-hud-info';
            this.hudInfo.innerHTML = '<span id="bone-fps">FPS: 0</span><span id="bone-ping">延迟: 0</span>';
            this.shadowRoot.appendChild(this.hudInfo);
            this.keystrokes = document.createElement('div');
            this.keystrokes.className = 'bone-keystrokes';
            this.keystrokes.innerHTML = `
                <div class="bone-key-row"><div class="bone-key" id="key-w">W</div></div>
                <div class="bone-key-row"><div class="bone-key" id="key-a">A</div><div class="bone-key" id="key-s">S</div><div class="bone-key" id="key-d">D</div></div>
                <div class="bone-key-row">
                <div class="bone-key mouse" id="key-lmb">左键<div class="bone-cps" id="cps-lmb">0 CPS</div></div>
                <div class="bone-key mouse" id="key-rmb">右键<div class="bone-cps" id="cps-rmb">0 CPS</div></div>
                </div>
                <div class="bone-key-row"><div class="bone-key spacebar" id="key-space">空格</div></div>
                `;
            this.shadowRoot.appendChild(this.keystrokes);
            this.menuButton = document.createElement('div');
            this.menuButton.className = 'bone-menu-button';
            this.menuButton.textContent = '≡';
            this.menuButton.addEventListener('click', () => this.toggleUI());
            this.shadowRoot.appendChild(this.menuButton);
        },
        toggleCategory(category) {
            const panel = this.panels[category];
            if (panel) {
                const isVisible = panel.classList.contains('visible');
                panel.classList.toggle('visible', !isVisible);

                const btn = this.categoriesContainer.querySelector(`[data-category="${category}"]`);
                if (btn) {
                    btn.classList.toggle('active', !isVisible);
                }
            }
        },
        toggleUI() {
            this.visible = !this.visible;
            this.overlay.classList.toggle('visible', this.visible);

            this.categories.forEach(category => {
                const panel = this.panels[category];
                const btn = this.categoriesContainer.querySelector(`[data-category="${category}"]`);
                if (panel) {
                    panel.classList.toggle('visible', this.visible);
                }
                if (btn) {
                    btn.classList.toggle('active', this.visible);
                }
            }
            );
        },
        updateHUD() {
            if (!this.arrayList || !this.watermark)
                return;
            const arrayListModule = client.modules['Danh sách tính năng'];
            const watermarkModule = client.modules['Hình mờ'];
            const blurModule = client.modules['Mơ hồ'];
            if (this.overlay && blurModule) {
                this.overlay.style.backdropFilter = blurModule.enabled ? 'blur(8px)' : 'none';
            }
            this.watermark.style.display = watermarkModule && watermarkModule.enabled ? 'block' : 'none';
            this.categoriesContainer.style.display = watermarkModule && watermarkModule.enabled ? 'flex' : 'none';
            this.arrayList.style.display = arrayListModule && arrayListModule.enabled ? 'flex' : 'none';
            if (!arrayListModule || !arrayListModule.enabled)
                return;
            const enabledModules = utils.values(client.modules).filter(module => module.enabled && module.category !== 'HUD');
            const moduleNames = enabledModules.map(module => module.name);
            enabledModules.forEach(module => {
                const className = module.name.replace(/\s+/g, '-');
                let element = this.arrayList.querySelector(`[data-name="${className}"]`);
                if (!element) {
                    element = document.createElement('div');
                    element.className = 'bone-array-item-wrapper';
                    element.dataset.name = className;
                    element.dataset.rawname = module.name;
                    element.innerHTML = `<div class="bone-array-item">${module.name}</div>`;
                    this.arrayList.appendChild(element);
                    requestAnimationFrame( () => requestAnimationFrame( () => element.classList.add('show')));
                } else {
                    if (!element.classList.contains('show')) {
                        element.classList.add('show');
                    }
                }
            }
            );
            Array.from(this.arrayList.children).forEach(element => {
                const moduleName = element.dataset.rawname;
                if (!moduleNames.includes(moduleName)) {
                    if (element.classList.contains('show')) {
                        element.classList.remove('show');
                        setTimeout( () => {
                            if (element.parentElement && !element.classList.contains('show')) {
                                element.remove();
                            }
                        }
                        , 300);
                    }
                }
            }
            );
            const elements = Array.from(this.arrayList.children);
            elements.sort( (a, b) => {
                let widthA = parseFloat(a.dataset.pxWidth);
                if (isNaN(widthA)) {
                    const itemEl = a.querySelector('.bone-array-item');
                    widthA = itemEl ? itemEl.offsetWidth : 0;
                    if (widthA > 0)
                        a.dataset.pxWidth = widthA;
                }
                let widthB = parseFloat(b.dataset.pxWidth);
                if (isNaN(widthB)) {
                    const itemEl = b.querySelector('.bone-array-item');
                    widthB = itemEl ? itemEl.offsetWidth : 0;
                    if (widthB > 0)
                        b.dataset.pxWidth = widthB;
                }
                if (widthA !== widthB)
                    return widthB - widthA;
                return a.dataset.rawname.localeCompare(b.dataset.rawname);
            }
            );
            elements.forEach( (element, index) => {
                element.style.order = index;
            }
            );
        },
        createPanels() {
            this.categories.forEach( (category, index) => {
                const panel = document.createElement('div');
                panel.className = 'bone-panel';
                panel.style.left = `${120 + index * 200}px`;
                panel.style.top = '45px';
                panel.innerHTML = `<div class="bone-panel-header">${category}<div class="bone-panel-arrow"></div></div><div class="bone-panel-content" data-panel-cat="${category}"></div>`;
                this.shadowRoot.appendChild(panel);
                this.panels[category] = panel;
                this.makeDraggable(panel);

                const arrow = panel.querySelector('.bone-panel-arrow');
                arrow.onclick = (event) => {
                    event.stopPropagation();
                    const content = panel.querySelector('.bone-panel-content');
                    const isOpen = content.style.display !== 'none';
                    content.style.display = isOpen ? 'none' : 'block';
                    arrow.classList.toggle('open', !isOpen);
                }
                ;
            }
            );
        },
        makeDraggable(element) {
            const header = element.querySelector('.bone-panel-header');
            header.onmousedown = event => {
                event.preventDefault();
                const rect = element.getBoundingClientRect();
                const offsetX = event.clientX - rect.left;
                const offsetY = event.clientY - rect.top;
                element.style.transition = 'none';
                const onMouseMove = event => {
                    element.style.left = event.clientX - offsetX + 'px';
                    element.style.top = event.clientY - offsetY + 'px';
                }
                ;
                const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    element.style.transition = '0.2s';
                }
                ;
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            }
            ;
        },
        render() {
            this.categories.forEach(category => {
                const content = this.shadowRoot.querySelector(`[data-panel-cat="${category}"]`);
                content.innerHTML = '';
                const modules = utils.values(client.modules).filter(module => module.category === category);
                modules.forEach(module => {
                    const moduleEl = document.createElement('div');
                    moduleEl.className = `bone-module ${module.enabled ? 'active' : ''}`;
                    const keybind = module.key ? module.key.replace('Key', '') : '';
                    moduleEl.innerHTML = `<span>${module.name}</span><div class="bone-module-controls" style="display:flex; align-items:center;"><span class="bone-module-keybind">${keybind}</span>${module.settings ? '<span class="bone-module-expand">></span>' : ''}</div>`;
                    moduleEl.onclick = event => {
                        if (event.target.classList.contains('bone-module-expand') || this.bindingModule)
                            return;
                        if (module.type === 'action') {
                            module.onEnable?.();
                            ui.notify(`${module.name} Đã thực hiện`, '#2F8CFF');
                            moduleEl.classList.add('active');
                            setTimeout( () => moduleEl.classList.remove('active'), 150);
                            return;
                        }
                        module.toggle();
                        moduleEl.classList.toggle('active', module.enabled);
                    }
                    ;
                    moduleEl.oncontextmenu = event => {
                        event.preventDefault();
                        if (this.bindingModule)
                            return;
                        this.bindingModule = module;
                        moduleEl.classList.add('binding');
                        moduleEl.querySelector('.bone-module-keybind').textContent = '[...]';
                    }
                    ;
                    const expandBtn = moduleEl.querySelector('.bone-module-expand');
                    if (expandBtn) {
                        expandBtn.onclick = event => {
                            event.stopPropagation();
                            this.toggleDropdown(module.name, expandBtn);
                        }
                        ;
                    }
                    const dropdown = document.createElement('div');
                    dropdown.className = 'bone-dropdown';
                    dropdown.dataset.dropdownName = module.name.replace(/\s+/g, '-');
                    if (module.settings) {
                        utils.entries(module.settings).forEach( ([name,setting]) => {
                            const settingEl = document.createElement('div');
                            settingEl.className = 'bone-setting';
                            if (setting.type === 'slider') {
                                const max = setting.max;
                                const value = setting.value;
                                const displayValue = setting.value;
                                settingEl.innerHTML = `<div class="bone-setting-label"><span>${name}</span><span>${displayValue}</span></div><input type="range" class="bone-setting-slider" min="${setting.min}" max="${max}" step="${setting.step || 1}" value="${value}">`;
                                settingEl.querySelector('input').oninput = event => {
                                    setting.value = parseFloat(event.target.value);
                                    settingEl.querySelector('.bone-setting-label span:last-child').textContent = setting.value;
                                    setting.onChange?.(setting.value);
                                }
                                ;
                            } else if (setting.type === 'checkbox') {
                                settingEl.style.flexDirection = 'row';
                                settingEl.style.justifyContent = 'space-between';
                                settingEl.style.alignItems = 'center';
                                settingEl.innerHTML = `<span style="font-size:11px;color:var(--text-secondary);font-weight:700;">${name}</span><label class="bone-checkbox-wrapper"><input type="checkbox" ${setting.value ? 'checked' : ''}><span class="bone-checkmark"></span></label>`;
                                settingEl.querySelector('input').onchange = event => {
                                    setting.value = event.target.checked;
                                    setting.onChange?.(setting.value);
                                }
                                ;
                            }
                            dropdown.appendChild(settingEl);
                        }
                        );
                    }
                    content.appendChild(moduleEl);
                    content.appendChild(dropdown);
                }
                );
            }
            );
        },
        toggleDropdown(moduleName, button) {
            const dropdown = this.shadowRoot.querySelector(`[data-dropdown-name="${moduleName.replace(/\s+/g, '-')}"]`);
            if (dropdown) {
                const isOpen = dropdown.classList.toggle('open');
                button.classList.toggle('open', isOpen);
            }
        },
        setupEvents() {
            document.isRightMouseDown = false;
            window.addEventListener('pointerdown', event => {
                if (event.pointerType === 'mouse' && event.button === 2) {
                    document.isRightMouseDown = true;
                }
            }
            );
            window.addEventListener('pointerup', event => {
                if (event.pointerType === 'mouse' && event.button === 2) {
                    document.isRightMouseDown = false;
                }
            }
            );
            window.addEventListener('contextmenu', event => {
                const fastPlace = client.modules['Sắp xếp nhanh'];
                if (fastPlace && fastPlace.enabled) {
                    event.preventDefault();
                }
            }
            );
            window.addEventListener('mousedown', event => {
                if (event.button === 0) {
                    const lmbKey = this.shadowRoot.getElementById('key-lmb');
                    if (lmbKey)
                        lmbKey.classList.add('active');
                    stats.lClicks.push(Date.now());
                } else if (event.button === 2) {
                    const rmbKey = this.shadowRoot.getElementById('key-rmb');
                    if (rmbKey)
                        rmbKey.classList.add('active');
                    stats.rClicks.push(Date.now());
                }
            }
            );
            window.addEventListener('mouseup', event => {
                if (event.button === 0) {
                    const lmbKey = this.shadowRoot.getElementById('key-lmb');
                    if (lmbKey)
                        lmbKey.classList.remove('active');
                } else if (event.button === 2) {
                    const rmbKey = this.shadowRoot.getElementById('key-rmb');
                    if (rmbKey)
                        rmbKey.classList.remove('active');
                }
            }
            );
            window.addEventListener('keyup', event => {
                const keyName = event.code.toLowerCase().replace('key', '');
                const keyEl = this.shadowRoot.getElementById('key-' + (event.code === 'Space' ? 'space' : keyName));
                if (keyEl)
                    keyEl.classList.remove('active');
            }
            );
            window.addEventListener('keydown', event => {
                if (event.repeat)
                    return;
                const keyName = event.code.toLowerCase().replace('key', '');
                const keyEl = this.shadowRoot.getElementById('key-' + (event.code === 'Space' ? 'space' : keyName));
                if (keyEl)
                    keyEl.classList.add('active');
                if (this.bindingModule) {
                    event.preventDefault();
                    event.stopPropagation();
                    const module = this.bindingModule;
                    module.key = event.code === 'Escape' || event.code === 'Delete' ? null : event.code;
                    const bindingEl = this.shadowRoot.querySelector('.bone-module.binding');
                    if (bindingEl) {
                        bindingEl.classList.remove('binding');
                        bindingEl.querySelector('.bone-module-keybind').textContent = module.key ? module.key.replace('Key', '') : '';
                    }
                    this.bindingModule = null;
                    this.notify(`Đã rồi ${module.name} Liên kết với ${module.key || 'không có'}`);
                    return;
                }
                if (event.code === 'ShiftRight') {
                    this.toggleUI();
                }
                utils.values(client.modules).forEach(module => {
                    if (module.key === event.code) {
                        if (module.type === 'action') {
                            module.onEnable?.();
                            ui.notify(`${module.name} Đã thực hiện`, '#2F8CFF');
                            const moduleEls = this.shadowRoot.querySelectorAll('.bone-module');
                            moduleEls.forEach(el => {
                                if (el.querySelector('span').textContent === module.name) {
                                    el.classList.add('active');
                                    setTimeout( () => el.classList.remove('active'), 150);
                                }
                            }
                            );
                            return;
                        }
                        module.toggle();
                        const moduleEls = this.shadowRoot.querySelectorAll('.bone-module');
                        moduleEls.forEach(el => {
                            if (el.querySelector('span').textContent === module.name) {
                                el.classList.toggle('active', module.enabled);
                            }
                        }
                        );
                    }
                }
                );
            }
            );
        },
        notify(message, color) {
            let notifyContainer = document.getElementById('Krypton-notifications');
            if (!notifyContainer) {
                notifyContainer = document.createElement('div');
                notifyContainer.id = 'Krypton-notifications';
                notifyContainer.style.cssText = 'position:fixed;bottom:50px;right:20px;z-index:99999;display:flex;flex-direction:column;align-items:flex-end;pointer-events:none;';
                document.body.appendChild(notifyContainer);
            }

            const catColor = "#2F8CFF";
            const menuColor = "rgba(7, 17, 30, 0.95)";
            const isModule = message.includes("Đã bật") || message.includes("Tàn tật") || message.includes("Enabled") || message.includes("Disabled");
            const bgColor = isModule ? menuColor : catColor;

            const isSpecialNotification = message === "Sẵn sàng (Phím Shift phải dùng để bật/tắt menu.)" || message === "Đã thực thi HUD Editor." || message === "Tài khoản mới—đã hoàn tất thao tác." || message.includes("Đã liên kết") || message.includes("Bound ") || message === "Ready (Shift-Right)" || message === "HUDEditor Executed" || message === "NewAcc Executed";

            const notification = document.createElement("div");
            notification.className = "krypton-notification";

            const paddingStyle = isSpecialNotification ? 'padding:8px 15px;' : 'padding:8px 15px 8px 44px;';
            notification.style.cssText = `--notif-bg:${bgColor};--notif-border:${catColor};--notif-text:#ffffff;--progress-color:#ffffff;--duration:3000ms;position:relative;${paddingStyle}margin-bottom:8px;background:var(--notif-bg);border:1px solid var(--notif-border);border-radius:4px;color:var(--notif-text);font-weight:bold;text-shadow:0 0 5px var(--notif-border);box-shadow:0 0 10px var(--notif-border);white-space:nowrap;overflow:hidden;min-width:190px;min-height:38px;transform:translateX(120%);opacity:0;transition:transform 0.5s ease,opacity 0.5s ease;`;

            if (!isSpecialNotification) {
                const icon = document.createElement("div");
                icon.className = "krypton-notification-icon";
                icon.style.cssText = 'position:absolute;left:0;top:0;width:40px;height:100%;background-repeat:no-repeat;background-position:center;background-size:16px 16px;border-radius:4px 0 0 4px;';
                if (message.includes("Đã bật") || message.includes("Enabled")) {
                    icon.classList.add("enable");
                    icon.style.backgroundImage = 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QAAAAAAAD5Q7t/AAAACXBIWXMAAABgAAAAYADwa0LPAAAAzUlEQVRo3u2UMQ6CQBBFJx7Bm6hEvRmlW3onz6Shs3wWUhACYXeJzmj+a8lm3hsWzIQQQggh/g+gAVpvj1r5HXDnzdXbp1R+P5BnKWLjLTyWN7ObmW1Hj57eblnyE5sHuHi7ST4skpe85CWfPbwFmhXnj0A3IZ++IZ/6YR1wqjh/8Nx8Gg0tiujlH253vr861ES4y6+JCCOfEXEOL18SEVY+JyK8/CAizUT4/OcrI6beROzNF0bEll+I+A35mYjfkh9EpLAfrBBCCCE+yAvhEkVoyLBOOAAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyMi0wNC0wOVQxMzo1ODozMSswMDowMHxiwRcAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjItMDQtMDlUMTM6NTg6MzErMDA6MDANP3mrAAAAAElFTkSuQmCC")';
                } else if (message.includes("Đã bật") || message.includes("Disabled")) {
                    icon.classList.add("disable");
                    icon.style.backgroundImage = 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QAAAAAAAD5Q7t/AAAACXBIWXMAAABgAAAAYADwa0LPAAAA+klEQVRo3u2YQQ6CMBAAUfCHhIP+zkg88EMxGQ+WpCFgLN21i9k5ElNm2sASq8pxHMdxnJ0A1MAVuCis3QJ34KQp3/PmKRkR5Mew9qASEclPjEAnsG4XyU/0GgEt8JjdKOskZjsfr3kWD5CO+Lm8ZEQxeYmI4vI5EWbkt0SYk0+JMCv/TYR5+ShiaSCNK9eyB6BWxNJJ2N75hAgV+aNSxyHxug1WHtjkYVdKfr8P8adXZcqwMyc/+429iJQhZS5iy4Q1E7FF3kxEjnzxCAn5YhGS8kUi+IO/VWrgJrHzC2vHJzEAjXhAuFETTkL8UyCcRK8m7ziO4ziOAi8k8eVdStU49gAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyMi0wNS0wMVQwMToxOTo1OSswMDowMI9b1WEAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjItMDUtMDFUMDE1MTk1OSswMDowMDD+Bm3dAAAAAElFTkSuQmCC")';
                } else {
                    icon.classList.add("info");
                    icon.style.backgroundImage = 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QAAAAAAAD5Q7t/AAAACXBIWXMAAABgAAAAYADwa0LPAAADJklEQVRo3u2ZvU8UURTF7wC7JoCagJgQPgob7SwQkI8G/BsMRFtE/gOiCS3YIwFjr9FWpMTeSGKCDRI1IgEUKATUpfFnMa9Y7ryVeTNvd6LuSUi4MPfcc97MvI87IlVU8X8j8EEC1IpIj4gMiUiXiFwSkVYRaTSXHIrIloisiciKiCyLyMsgCH5l6h7oAO4Bm7jjEzADtGchvAV4ABwlEK5xBMwD5yol/gaw50G4xi4wWk7hOeDhHwTsA4+AW0C3uUs589MC9Jj/PTbXlsICkPMtvh5YKlFwC5gA6h35xoC1EpzPXfjijLxNfAGYAhpSck8aLo1FL3eixGOzDfR5GaGwRj+wY6kzn5b4poV0FejwJb6oVqfh1hhJStgMfFVkO+UQr0zoO7FHkimWcJ4vxk+Xx0YPo0PegOWdmHMV30F0kZpy5EhkwOTesUwY8Vdswu1BMbZcZ5uUBvLAO0UxEze5lujeZsJFQFoDJn9cUWwANXES+1TiPr4WFTcDDcCB0tKjr7M5GlLxYhAEPyptIAiC7yKypP48HMdAl4pfVFp8EZZP0GY1cFHFrzM0oGtrbVJnSWpV8YcklfWLGwRBktOfrq21We9Ao4r3kxjwhG8qPh3HwF8Fm4FDFZ/JUN9ZFR/EMbCt4gsZGtC1tTargTUVX87QgK6ttVkNvFLxsGSHaydoiwK46mMr4WEv1AgcKpruOIk1hE2nYoxlYEBv5j7G2syZ5BmVvI7jATvldvoU8F5RTLsQtBM90ExW0MBdlV4A2lw4hLDdp0n6y20AGLQM3qyTeEPUhP1Q3+lMFr+m7VC/S9K+KTBKFKvlMGHEv7HUu56WeMFCugMMeBQ/CHy21LnvgzxH2KvUKBB2D/IpuPPmhbW16Z8BdUm5daH6EiYg7B6M49C1IFykxolOlcXi/Z7DzZ2YpzQOgCfAbaAXOG9GOG9+7yXsYj8lusIee2y8jXwJIyNEZycf+ELaF9bBRDMwh70t7ooCMAs0VUS8MtJGuO3YSCB8A5jGdYVV8PWZtUZErki49e6SsHvQJsc/s26KyFsJt8TLIrKS+WfWKqr4B/AbewiI7s7vt/4AAAAldEVYdGRhdGU6Y3JlYXRlADIwMjItMDUtMDFUMDE1MTg0OSswMDowMDCsM77BAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDIyLTA1LTAxVDAxOjE4OjQ5KzAwOjAw3W4GfQAAAABJRU5ErkJggg==")';
                }

                notification.appendChild(icon);
            }

            const content = document.createElement("div");
            content.className = "krypton-notification-content";
            content.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;justify-content:center;height:100%;gap:2px;';

            const parts = message.split(' ');
            const titleText = parts[0];
            const descText = parts.slice(1).join(' ');

            const title = document.createElement("div");
            title.className = "krypton-notification-title";
            title.style.cssText = 'font-size:15px;font-weight:bold;color:#ffffff;line-height:1.1;';
            title.textContent = titleText;

            const desc = document.createElement("div");
            desc.className = "krypton-notification-desc";
            desc.style.cssText = 'font-size:12px;opacity:0.8;font-weight:normal;line-height:1.1;';
            desc.textContent = descText;

            const progress = document.createElement("div");
            progress.className = "krypton-notification-progress";
            progress.style.cssText = 'position:absolute;bottom:0;left:0;width:100%;height:2px;background:var(--progress-color);transform:scaleX(1);transform-origin:left;transition:transform var(--duration) linear;';

            content.appendChild(title);
            content.appendChild(desc);
            notification.appendChild(content);
            notification.appendChild(progress);
            notifyContainer.appendChild(notification);

            setTimeout( () => {
                notification.style.opacity = "1";
                notification.style.transform = "translateX(0)";
                progress.style.transform = "scaleX(0)";
            }
            , 10);

            setTimeout( () => {
                notification.style.opacity = "0";
                notification.style.transform = "translateX(120%)";
                setTimeout( () => notification.remove(), 400);
            }
            , 3000);
        }
    };
    class Module {
        constructor(name, category, options={}) {
            this.name = name;
            this.category = category;
            this.enabled = false;
            this.type = 'toggle';
            this._intervals = [];
            this._loops = [];
            utils.assign(this, options);
        }
        setLoop(callback) {
            let loop = {
                active: true,
                id: null
            };
            const tick = () => {
                if (!this.enabled || !loop.active)
                    return;
                callback();
                loop.id = requestAnimationFrame(tick);
            }
            ;
            loop.id = requestAnimationFrame(tick);
            this._loops.push(loop);
        }
        setInterval(callback, delay) {
            const intervalId = setInterval( () => {
                if (this.enabled)
                    callback();
            }
            , delay);
            this._intervals.push(intervalId);
        }
        toggle(silent=false) {
            this.enabled = !this.enabled;
            if (this.enabled) {
                this._intervals = [];
                this._loops = [];
                if (gameState.injected)
                    this.onEnable?.();
            } else {
                this._intervals.forEach(clearInterval);
                this._loops.forEach(loop => {
                    loop.active = false;
                    cancelAnimationFrame(loop.id);
                }
                );
                this._intervals = [];
                this._loops = [];
                if (gameState.injected)
                    this.onDisable?.();
            }
            if (!silent && ui) {
                ui.notify(`${this.name} ${this.enabled ? 'Đã bật' : 'Tàn tật'}`, this.enabled ? '#36A3FF' : '#FF4D6D');
            }
        }
    }

    function getThinMeshes() {
        if (!gameState.rendering)
            return [];
        if (gameState.rendering.thinMeshes)
            return gameState.rendering.thinMeshes;
        const renderingValues = utils.values(gameState.rendering);
        for (const val of renderingValues) {
            if (val && val.thinMeshes && Array.isArray(val.thinMeshes))
                return val.thinMeshes;
        }
        return [];
    }

    let espInterval = null;
    function setRenderingGroup(enabled) {
        const meshes = getThinMeshes();
        if (!meshes)
            return;
        for (const mesh of meshes) {
            const defaultMesh = mesh?.meshVariations?.__DEFAULT__?.mesh;
            if (defaultMesh)
                defaultMesh.renderingGroupId = enabled ? 2 : 0;
        }
    }

    function worldToScreen(position) {
        if (!gameState.Lion?.scene)
            return null;
        const scene = gameState.Lion.scene
          , engine = scene.getEngine()
          , camera = scene.activeCamera;
        if (!engine || !camera)
            return null;
        let cameraPos = [0, 0, 0];
        AwuD: for (let key in gameState.noa) {
            const val = gameState.noa[key];
            if (Array.isArray(val) && val.length === 3 && typeof val[0] === 'number') {
                cameraPos = val;
                break AwuD;
            }
        }
        const dx = position[0] - cameraPos[0]
          , dy = position[1] - cameraPos[1]
          , dz = position[2] - cameraPos[2];
        const matrix = scene.getTransformMatrix().m;
        const x = dx * matrix[0] + dy * matrix[4] + dz * matrix[8] + matrix[12];
        const y = dx * matrix[1] + dy * matrix[5] + dz * matrix[9] + matrix[13];
        const w = dx * matrix[3] + dy * matrix[7] + dz * matrix[11] + matrix[15];
        if (w < 0.1)
            return null;
        const ndcX = x / w
          , ndcY = y / w;
        const width = engine.getRenderWidth()
          , height = engine.getRenderHeight();
        const viewport = camera.viewport.toGlobal(width, height);
        return {
            x: viewport.x + (ndcX * 0.5 + 0.5) * viewport.width,
            y: viewport.y + (1 - (ndcY * 0.5 + 0.5)) * viewport.height
        };
    }

    function getEntityName(entityId) {
        const name = gameState.bloxd?.entityNames?.[entityId]?.entityName;
        return name ? name.split(' (')[0] : 'không xác định';
    }

    function getEntityHealth(entityId) {
        const health = utils.values(gameState.noa.entities?.[gameState.impKey]?.entityName?.hash?.[entityId] || {})[8];
        return health === null || health === 0 ? 1 : health ?? 1;
    }

    function createMesh(name, texture, position) {
        if (!gameState.Lion || !gameState.noa) {
            return null;
        }
        try {
            const Mesh = gameState.Lion.Mesh;
            const scene = gameState.Lion.scene;
            const Color3 = gameState.Lion.Color3;
            const mesh = Mesh.CreateBox(name, 1.01, scene);
            mesh.material = new gameState.Lion.StandardMaterial(name,scene);
            mesh.renderingGroupId = 2;
            if (texture) {
                const tex = new gameState.Lion.Texture(texture,scene,false,true,1);
                mesh.material.diffuseTexture = tex;
                mesh.material.emissiveTexture = tex;
                mesh.material.emissiveColor = new Color3(1,1,1);
                mesh.material.specularColor = new Color3(0,0,0);
                mesh.material.wireframe = false;
            } else {
                mesh.material.wireframe = true;
                mesh.material.emissiveColor = new Color3(1,1,1);
            }
            const entityId = gameState.noa.entities.add(position, 1, 1, mesh, [0, 0, 0], false, false);
            return {
                mesh: mesh,
                entityId: entityId
            };
        } catch (err) {}
    }

    function disposeMesh(obj) {
        if (!obj) {
            return;
        }
        try {
            if (obj.mesh) {
                obj.mesh.dispose();
            }
            if (obj.entityId) {
                gameState.noa.entities.deleteEntity(obj.entityId);
            }
        } catch (err) {}
    }

    function scanChunks(module, blockIds, callback) {
        if (!gameState.world || !gameState.impKey || !gameState.world[gameState.impKey]?.hash) {
            return;
        }
        const chunks = gameState.world[gameState.impKey].hash;
        const playerPos = gameUtils.getPosition(1);
        if (!playerPos) {
            return;
        }
        const nearbyChunks = [];
        for (const key in chunks) {
            const chunk = chunks[key];
            if (!chunk.pos) {
                continue;
            }
            const dist = Math.hypot(chunk.pos[0] - playerPos[0], chunk.pos[1] - playerPos[1], chunk.pos[2] - playerPos[2]);
            if (dist < 96) {
                nearbyChunks.push({
                    chunk: chunk,
                    dist: dist
                });
            }
        }
        nearbyChunks.sort( (a, b) => a.dist - b.dist);
        const activeChunks = new Set();
        nearbyChunks.forEach( ({chunk}) => {
            const chunkKey = chunk.pos[0] + "|" + chunk.pos[1] + "|" + chunk.pos[2];
            activeChunks.add(chunkKey);
            if (module.scannedChunks.has(chunkKey)) {
                return;
            }
            if (!module.chunkDataField) {
                for (const key in chunk) {
                    if (chunk[key]?.stride && chunk[key]?.data) {
                        module.chunkDataField = key;
                        break;
                    }
                }
            }
            const data = chunk[module.chunkDataField];
            if (data?.data) {
                module.scannedChunks.add(chunkKey);
                const {data: blockData, stride: strideData} = data;
                const chunkPos = chunk.pos;
                for (let i = 0; i < blockData.length; i++) {
                    const blockId = blockData[i];
                    if (blockIds.indexOf(blockId) !== -1) {
                        const y = Math.floor(i / strideData[0]);
                        const rem = i % strideData[0];
                        const x = Math.floor(rem / strideData[1]);
                        const z = rem % strideData[1];
                        callback(blockId, chunkPos[0] + y + 0.5, chunkPos[1] + x + 0.5, chunkPos[2] + z + 0.5, chunkKey);
                    }
                }
            }
        }
        );
        for (const key in module.ores) {
            if (!activeChunks.has(key)) {
                module.ores[key].forEach(ore => disposeMesh(ore.boxObj));
                delete module.ores[key];
                module.scannedChunks.delete(key);
            }
        }
    }

    const neighborOffsets = ( () => {
        const offsets = [];
        const radius = 7;
        for (let x = -radius; x <= radius; x++) {
            for (let y = -radius; y <= radius; y++) {
                for (let z = -radius; z <= radius; z++) {
                    if (x === 0 && y === 0 && z === 0) {
                        continue;
                    }
                    offsets.push({
                        x: x,
                        y: y,
                        z: z,
                        dist: x * x + y * y + z * z
                    });
                }
            }
        }
        offsets.sort( (a, b) => a.dist - b.dist);
        return offsets;
    }
    )();

    function findNearestBlock(position) {
        const [x,y,z] = position.map(Math.floor);
        EXyA: for (const offset of neighborOffsets) {
            if (offset.dist > 64)
                break EXyA;
            const [nx,ny,nz] = [x + offset.x, y + offset.y, z + offset.z];
            if (gameUtils.getBlockID(nx, ny, nz) !== 0)
                return [nx, ny, nz];
        }
        return null;
    }

    function lineOfSight(start, end) {
        let current = start.map(Math.floor);
        const target = end.map(Math.floor);
        const delta = current.map( (val, i) => Math.abs(target[i] - val));
        const step = current.map( (val, i) => Math.sign(target[i] - val));
        const path = [[...current]];
        const error = [0, 0, 0];
        while (error[0] < delta[0] || error[1] < delta[1] || error[2] < delta[2]) {
            const t = error.map( (val, i) => delta[i] ? (val + 0.5) / delta[i] : Infinity);
            const axis = t[0] <= t[1] && t[0] <= t[2] ? 0 : t[1] <= t[2] ? 1 : 2;
            current[axis] += step[axis];
            error[axis]++;
            path.push([...current]);
        }
        return path;
    }

    function findSendBytesMethod(obj) {
        return obj ? Object.getOwnPropertyNames(Object.getPrototypeOf(obj)).find(key => {
            const method = obj[key];
            return key !== 'constructor' && method?.length === 2 && /Protocol\.ROOM_DATA_BYTES/i.test(method) && /Uint8Array/.test(method);
        }
        ) : null;
    }

    function verticalLine(start, end) {
        const result = []
          , [x1,y1,z1] = start.map(Math.floor)
          , [x2,y2,z2] = end.map(Math.floor);
        let y = y1;
        result.push([x1, y, z1]);
        while (y !== y2) {
            y += Math.sign(y2 - y);
            result.push([x1, y, z1]);
        }
        let x = x1
          , z = z1;
        const dx = Math.abs(x2 - x)
          , dz = Math.abs(z2 - z);
        const sx = x < x2 ? 1 : -1
          , sz = z < z2 ? 1 : -1;
        let err = dx - dz;
        gZBA: while (true) {
            if (x === x2 && z === z2)
                break gZBA;
            const e2 = 2 * err;
            if (e2 > -dz) {
                err -= dz;
                x += sx;
            } else {
                err += dx;
                z += sz;
            }
            result.push([x, y, z]);
        }
        return result;
    }

    let keyReversalActive = false;
    let keyReversalInterval = null;
    let keydownHandler = null;
    let keyupHandler = null;

    const keysToReverse = {
        KeyW: {
            set: 'backward',
            clear: 'forward'
        },
        KeyS: {
            set: 'forward',
            clear: 'backward'
        },
        KeyA: {
            set: 'right',
            clear: 'left'
        },
        KeyD: {
            set: 'left',
            clear: 'right'
        },
        ArrowUp: {
            set: 'backward',
            clear: 'forward'
        },
        ArrowDown: {
            set: 'forward',
            clear: 'backward'
        },
        ArrowLeft: {
            set: 'right',
            clear: 'left'
        },
        ArrowRight: {
            set: 'left',
            clear: 'right'
        }
    };

    function startKeyReversal() {
        if (keyReversalActive)
            return;
        keyReversalActive = true;

        const inputState = gameState.noa?.inputs?.state;
        if (!inputState)
            return;

        keydownHandler = (e) => {
            if (e.code in keysToReverse) {
                const s = keysToReverse[e.code];
                inputState[s.set] = true;
                inputState[s.clear] = false;
                e.preventDefault();
                e.stopImmediatePropagation();
            }
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
                e.preventDefault();
                e.stopImmediatePropagation();
            }
        }
        ;

        keyupHandler = (e) => {
            if (e.code in keysToReverse) {
                const s = keysToReverse[e.code];
                inputState[s.set] = false;
                e.preventDefault();
                e.stopImmediatePropagation();
            }
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
                e.preventDefault();
                e.stopImmediatePropagation();
            }
        }
        ;

        window.addEventListener('keydown', keydownHandler, true);
        window.addEventListener('keyup', keyupHandler, true);
    }

    function stopKeyReversal() {
        if (!keyReversalActive)
            return;
        keyReversalActive = false;

        if (keydownHandler) {
            window.removeEventListener('keydown', keydownHandler, true);
            keydownHandler = null;
        }
        if (keyupHandler) {
            window.removeEventListener('keyup', keyupHandler, true);
            keyupHandler = null;
        }

        const inputState = gameState.noa?.inputs?.state;
        if (inputState) {
            inputState.forward = false;
            inputState.backward = false;
            inputState.left = false;
            inputState.right = false;
            inputState.sprint = false;
        }
    }
    function initKeyReversalCheck() {
        if (keyReversalInterval)
            return;
        keyReversalInterval = setInterval( () => {
            const flyEnabled = client.modules['chuyến bay']?.enabled || false;
            const speedEnabled = client.modules['tốc độ']?.enabled || false;

            if (flyEnabled || speedEnabled) {
                startKeyReversal();
            } else {
                stopKeyReversal();
            }
        }
        , 100);
    }
    function registerModules() {
        client.modules['Kill aura'] = new Module('kill aura','Chiến đấu',{
            lastAttackTime: 0,
            currentDelay: 50,
            lastSwing: 0,
            settings: {
                'Độ trễ': {
                    type: 'slider',
                    min: 0,
                    max: 1000,
                    step: 1,
                    value: 0
                },
                'Phạm vi': {
                    type: 'slider',
                    min: 1,
                    max: 10,
                    step: 0.1,
                    value: 10
                },
                'Độ mạnh hất văng': {
                    type: 'slider',
                    min: 0,
                    max: 5,
                    step: 0.1,
                    value: 5
                },
                'Kéo': {
                    type: 'checkbox',
                    value: false
                },
                'Hoạt ảnh vung tay': {
                    type: 'checkbox',
                    value: true
                },
                'Bao gồm sinh vật': {
                    type: 'checkbox',
                    value: false
                },
                'Chí mạng': {
                    type: 'checkbox',
                    value: true
                }
            },
            onEnable: function() {
                this.lastSwing = 0;
            },
            onTick: function() {
                const now = Date.now();
                const delay = this.settings['Độ trễ'].value;
                const finalDelay = delay + 10;
                const l = Date.now();
                const c = delay;
                if (l - this.lastSwing < c)
                    return;
                this.lastSwing = l;

                if (now - this.lastAttackTime < finalDelay)
                    return;

                const includeMobs = this.settings['Bao gồm sinh vật'].value;
                const swing = this.settings['Hoạt ảnh vung tay'].value;
                const pullEnable = this.settings['Kéo'].value;
                const kbStrength = this.settings['Độ mạnh hất văng'].value;
                const detectionRange = this.settings['Phạm vi'].value;
                const targets = includeMobs ? gameUtils.entityList : gameUtils.playerList;
                const playerPos = gameUtils.getPosition(1);
                if (!playerPos || !targets)
                    return;

                let targetArr = [];
                const rangeHalf = detectionRange / 2;
                const rangeHalfSq = rangeHalf * rangeHalf;
                targets.forEach(entityId => {
                    const targetPos = gameUtils.getPosition(entityId);
                    if (!targetPos)
                        return;
                    const dx = targetPos[0] - playerPos[0];
                    const dy = targetPos[1] - playerPos[1];
                    const dz = targetPos[2] - playerPos[2];
                    const distSq = dx * dx + dy * dy + dz * dz;
                    const dist = Math.hypot(dx, dy, dz);
                    if (distSq > rangeHalfSq)
                        return;
                    const lifeState = gameState.noa.entities.getState(entityId, 'genericLifeformState');
                    if (lifeState && !lifeState.isAlive)
                        return;
                    targetArr.push({
                        id: entityId,
                        pos: targetPos,
                        dist: dist,
                        hp: lifeState.health || 0,
                        distSq: distSq
                    });
                }
                );

                if (targetArr.length === 0) {
                    this.lastAttackTime = now;
                    this.currentDelay = finalDelay;
                    return;
                }

                targetArr.sort( (a, b) => a.dist - b.dist);

                const useCrit = this.settings['Chí mạng'].value;
                if (useCrit) {
                    gameUtils.simulateJump?.();
                }

                try {
                    targetArr.forEach(target => {
                        const entityId = target.id;
                        const targetPos = target.pos;

                        let direction = [0, 0, 0];
                        let dx = targetPos[0] - playerPos[0]
                          , dy = targetPos[1] - playerPos[1] + 1
                          , dz = targetPos[2] - playerPos[2];
                        const dist = Math.hypot(dx, dy, dz) || 1;
                        direction = [dx / dist, dy / dist, dz / dist];

                        if (pullEnable) {
                            direction[0] *= -1;
                            direction[1] *= -1;
                            direction[2] *= -1;
                        }

                        direction[0] *= kbStrength;
                        direction[1] *= kbStrength;
                        direction[2] *= kbStrength;

                        try {
                            gameUtils.doAttack(direction, String(entityId), 'BodyMesh');
                        } catch (err) {}
                    }
                    );
                } finally {}

                this.lastAttackTime = now;
                this.currentDelay = finalDelay;
                if (swing) {
                    gameUtils.getMoveState(1)?.setArmsAreSwinging?.();
                    gameUtils.getHeldItem(1)?.trySwingBlock?.(Date.now());
                }
            }
        });
        client.modules['Tự động uống thuốc'] = new Module('Tự động uống thuốc','Chiến đấu',{
            lastSwapTime: 0,
            settings: {
                'Ô vật phẩm mục tiêu': {
                    type: 'slider',
                    min: 0,
                    max: 8,
                    step: 1,
                    value: 8
                }
            },
            onEnable: function() {
                this.setInterval( () => {
                    if (Date.now() - this.lastSwapTime < 500)
                        return;
                    try {
                        const inventory = gameState.noa.entities[gameState.impKey]?.inventory?.list?.[0]?.opWrapper;
                        if (!inventory || !inventory.playerInventory?.items)
                            return;
                        const items = inventory.playerInventory.items;
                        const targetSlot = this.settings['Ô vật phẩm mục tiêu'].value;
                        const isPotion = item => item?.name && (item.name.toLowerCase().includes('potion') || item.name.toLowerCase().includes('heal'));
                        if (isPotion(items[targetSlot]))
                            return;
                        let potionSlot = -1;
                        for (let i = 0; i < items.length; i++) {
                            if (i !== targetSlot && isPotion(items[i])) {
                                potionSlot = i;
                                break;
                            }
                        }
                        if (potionSlot !== -1) {
                            inventory.swapPosClient(potionSlot, targetSlot);
                            this.lastSwapTime = Date.now();
                        }
                    } catch (err) {}
                }
                , 200);
            }
        });
        client.modules['TriggerBot'] = new Module('TriggerBot','Chiến đấu',{
            onEnable: function() {
                this.setLoop( () => {
                    const playerEntity = gameUtils.getPlayerEntity();
                    const breakingItem = playerEntity?._blockItem?.breakingItem;
                    if (!breakingItem)
                        return;
                    const method = Object.getOwnPropertyNames(Object.getPrototypeOf(breakingItem)).find(key => key !== 'constructor' && breakingItem[key]?.length === 0 && /doPickAction/.test(breakingItem[key]));
                    if (!method)
                        return;
                    const result = breakingItem[method]();
                    const lifeState = result?.hitEId && gameState.noa.entities.getState(result.hitEId, 'genericLifeformState');
                    if (result?.hitEId && lifeState?.isAlive) {
                        const heading = gameState.noa.camera.heading
                          , pitch = gameState.noa.camera.pitch;
                        const direction = [Math.sin(heading) * Math.cos(pitch), -Math.sin(pitch), Math.cos(heading) * Math.cos(pitch)];
                        gameUtils.doAttack(direction, String(result.hitEId), 'BodyMesh');
                        playerEntity._standardItem?.trySwingBlock?.(Date.now());
                        gameUtils.getMoveState(1)?.setArmsAreSwinging?.();
                    }
                }
                );
            }
        });
        client.modules['Khoảng cách vật phẩm'] = new Module('Khoảng cách vật phẩm','Thế giới',{
            originalAABB: null,
            aabbKey: null,
            onEnable: function() {
                const entitiesProto = Object.getPrototypeOf(gameState.noa.entities);
                this.aabbKey = Object.getOwnPropertyNames(entitiesProto).find(key => key !== 'constructor' && `${entitiesProto[key]}`.includes('.base'));
                if (this.aabbKey) {
                    this.originalAABB = entitiesProto[this.aabbKey];
                    const self = this;
                    gameState.noa.entities[this.aabbKey] = function(aabb, entity) {
                        const extend = 5;
                        const newAABB = Object.assign({}, aabb);
                        newAABB.base = aabb.base.map(val => val - extend);
                        newAABB.max = aabb.max.map(val => val + extend);
                        return self.originalAABB.call(this, newAABB, entity);
                    }
                    ;
                }
            },
            onDisable: function() {
                if (this.aabbKey && this.originalAABB) {
                    const entitiesProto = Object.getPrototypeOf(gameState.noa.entities);
                    entitiesProto[this.aabbKey] = this.originalAABB;
                    delete gameState.noa.entities[this.aabbKey];
                }
                this.originalAABB = null;
                this.aabbKey = null;
            }
        });
        client.modules['Magic Bullet'] = new Module('Magic Bullet','Chiến đấu',{
            _OriginalFireBullet: null,
            onEnable: function() {
                const self = this;
                this.setInterval( () => {
                    const gunItem = gameUtils.getPlayerEntity()?._gunItem;
                    if (!gunItem || !gunItem.fireBullet)
                        return;
                    if (!this._OriginalFireBullet) {
                        this._OriginalFireBullet = gunItem.fireBullet;
                    }
                    if (gunItem.fireBullet === this._OriginalFireBullet) {
                        gunItem.fireBullet = function(...args) {
                            const players = gameUtils.playerList;
                            const playerPos = gameUtils.getPosition(1);
                            let target = null;
                            if (playerPos && players.length > 0) {
                                cWvA: for (const playerId of players) {
                                    const lifeState = gameState.noa.entities.getState(playerId, 'genericLifeformState');
                                    if (lifeState && !lifeState.isAlive)
                                        continue cWvA;
                                    const entity = gameState.entityList[1][playerId];
                                    if (entity._invincible)
                                        continue cWvA;
                                    const playerTeam = gameState.entityList[1][1].lobbyLeaderboardValues?.team;
                                    const targetTeam = entity.lobbyLeaderboardValues?.team;
                                    if (playerTeam !== undefined && targetTeam !== undefined && playerTeam === targetTeam)
                                        continue cWvA;
                                    const targetPos = gameUtils.getPosition(playerId);
                                    if (!targetPos)
                                        continue cWvA;
                                    target = {
                                        id: playerId.toString(),
                                        pos: targetPos
                                    };
                                    break;
                                }
                            }
                            if (target) {
                                const dx = target.pos[0] - playerPos[0];
                                const dy = target.pos[1] + 1.4 - (playerPos[1] + 1.5);
                                const dz = target.pos[2] - playerPos[0];
                                const dist = Math.hypot(dx, dy, dz);
                                args[0] = [dx / dist, dy / dist, dz / dist];
                            }
                            const result = self._OriginalFireBullet.apply(this, args);
                            if (target) {
                                result.hitResult = 0;
                                result.hitEId = target.id;
                                result.meshNodeHit = 'HeadMesh';
                            }
                            return result;
                        }
                        ;
                    }
                }
                , 500);
            },
            onDisable: function() {
                const gunItem = gameUtils.getPlayerEntity()?._gunItem;
                if (gunItem && this._OriginalFireBullet) {
                    gunItem.fireBullet = this._OriginalFireBullet;
                }
                this._OriginalFireBullet = null;
            }
        });
        client.modules['Tự động đặt bẫy'] = new Module('Tự động đặt bẫy','Chiến đấu',{
            settings: {
                'phạm vi': {
                    type: 'slider',
                    min: 1,
                    max: 12,
                    step: 0.1,
                    value: 12
                }
            },
            onEnable: function() {
                this.setInterval( () => {
                    const heldItem = gameUtils.safeGetHeldItem(1);
                    if (!heldItem?.typeObj?.name)
                        return;
                    const itemName = heldItem.typeObj.name;
                    if (!itemName.includes('Net') && !itemName.includes('Spike'))
                        return;

                    const detectionRange = this.settings['phạm vi'].value;
                    const rangeHalf = detectionRange / 2;
                    const rangeHalfSq = rangeHalf * rangeHalf;
                    const targets = gameUtils.playerList;
                    const playerPos = gameUtils.getPosition(1);
                    if (!playerPos || !targets)
                        return;

                    let targetArr = [];
                    targets.forEach(entityId => {
                        const targetPos = gameUtils.getPosition(entityId);
                        if (!targetPos)
                            return;
                        const dx = targetPos[0] - playerPos[0];
                        const dy = targetPos[1] - playerPos[1];
                        const dz = targetPos[2] - playerPos[2];
                        const distSq = dx * dx + dy * dy + dz * dz;
                        if (distSq > rangeHalfSq)
                            return;
                        const lifeState = gameState.noa.entities.getState(entityId, 'genericLifeformState');
                        if (lifeState && !lifeState.isAlive)
                            return;
                        targetArr.push({
                            id: entityId,
                            pos: targetPos,
                            dist: Math.hypot(dx, dy, dz)
                        });
                    }
                    );

                    if (targetArr.length === 0)
                        return;

                    targetArr.sort( (a, b) => a.dist - b.dist);

                    targetArr.forEach(target => {
                        const targetPos = target.pos;
                        const [tx,ty,tz] = targetPos.map(Math.floor);

                        const placePositions = [[tx, ty, tz], [tx, ty + 1, tz], [tx + 1, ty + 1, tz], [tx - 1, ty + 1, tz], [tx, ty + 1, tz + 1], [tx, ty + 1, tz - 1]];

                        placePositions.forEach(pos => {
                            if (gameUtils.getBlockID(pos[0], pos[1], pos[2]) === 0) {
                                gameUtils.placeBlock(pos);
                            }
                        }
                        );
                    }
                    );
                }
                , 10);
            }
        });
        client.modules['Bay'] = new Module('Bay','Di chuyển',{
            settings: {
                'Tăng tốc': {
                    type: 'slider',
                    min: 1,
                    max: 200,
                    step: 1,
                    value: 25
                }
            },
            _origGravity: null,
            _origVu: null,
            _origWalkSpeed: null,
            _origCrouchSpeed: null,
            _origSprintSpeed: null,

            onEnable: function() {
                this._saveOriginalValues();
                this._applyFly();
            },
            onDisable: function() {
                this._restoreValues();
            },
            onTick: function() {
                if (!this.enabled)
                    return;
                this._applyFly();
                Promise.resolve().then( () => {
                    if (this.enabled)
                        this._applyFly();
                }
                );
            },
            _saveOriginalValues: function() {
                if (gameState.physics) {
                    const phys = gameState.physics;
                    for (const key in phys) {
                        const val = phys[key];
                        if (Array.isArray(val) && val.length === 3 && typeof val[0] === 'number') {
                            this._origGravity = {
                                obj: phys,
                                key: key,
                                index: 1,
                                value: val[1]
                            };
                            break;
                        }
                    }
                    const bodies = phys.bodies || phys._5d3691;
                    if (bodies && bodies[0] && bodies[0]._19187c) {
                        this._origVu = {
                            obj: bodies[0]._19187c,
                            index: 1,
                            value: bodies[0]._19187c[1]
                        };
                    }
                }
                if (gameState.playerData) {
                    this._origWalkSpeed = gameState.playerData.walkingSpeed;
                    this._origCrouchSpeed = gameState.playerData.crouchingSpeed;
                    this._origSprintSpeed = gameState.playerData.sprintingSpeed;
                }
            },
            _applyFly: function() {
                this._applyGlide();
            },
            _applyGlide: function() {
                if (gameState.playerData) {
                    const boost = this.settings['tăng tốc'].value;
                    const inputState = gameState.noa?.inputs?.state;
                    let mul = 4;
                    if (inputState?.crouch)
                        mul = 2;
                    else if (inputState?.sprint)
                        mul = 6;
                    const finalSpeed = -boost * mul;

                    gameState.playerData.walkingSpeed = finalSpeed;
                    gameState.playerData.crouchingSpeed = finalSpeed;
                    gameState.playerData.sprintingSpeed = finalSpeed;
                }
            },
            _restoreValues: function() {
                if (this._origGravity) {
                    this._origGravity.obj[this._origGravity.key][this._origGravity.index] = this._origGravity.value;
                }
                if (this._origVu) {
                    this._origVu.obj[this._origVu.index] = this._origVu.value;
                }
                if (gameState.playerData) {
                    if (this._origWalkSpeed != null)
                        gameState.playerData.walkingSpeed = this._origWalkSpeed;
                    if (this._origCrouchSpeed != null)
                        gameState.playerData.crouchingSpeed = this._origCrouchSpeed;
                    if (this._origSprintSpeed != null)
                        gameState.playerData.sprintingSpeed = this._origSprintSpeed;
                }
            }
        });
        client.modules['Tốc độ'] = new Module('Tốc độ','Di chuyển',{
            settings: {
                'Tốc độ di chuyển': {
                    type: 'slider',
                    min: 1,
                    max: 30,
                    step: 1,
                    value: 2
                }
            },
            _originalWalkSpeed: null,
            _originalCrouchSpeed: null,
            _originalSprintSpeed: null,

            onEnable: function() {
                if (gameState.playerData) {
                    this._originalWalkSpeed = gameState.playerData.walkingSpeed;
                    this._originalCrouchSpeed = gameState.playerData.crouchingSpeed;
                    this._originalSprintSpeed = gameState.playerData.sprintingSpeed;
                }
            },

            onTick: function() {
                if (!this.enabled || !gameState.playerData)
                    return;
                const speedVal = this.settings['Tốc độ di chuyển'].value;
                const inputState = gameState.noa?.inputs?.state;
                let mul = 4;
                if (inputState?.crouch)
                    mul = 2;
                else if (inputState?.sprint)
                    mul = 6;
                const finalSpeed = -speedVal * mul;

                gameState.playerData.walkingSpeed = finalSpeed;
                gameState.playerData.crouchingSpeed = finalSpeed;
                gameState.playerData.sprintingSpeed = finalSpeed;
            },

            onDisable: function() {
                if (gameState.playerData) {
                    gameState.playerData.walkingSpeed = this._originalWalkSpeed || 4;
                    gameState.playerData.crouchingSpeed = this._originalCrouchSpeed || 2;
                    gameState.playerData.sprintingSpeed = this._originalSprintSpeed || 6;
                }
            }
        });
        client.modules['Scaffold'] = new Module('Scaffold','Di chuyển',{
            isBuilding: false,
            interval: null,
            lastPosition: null,
            lastVelocity: [0, 0, 0],
            airTicks: 0,
            lastPlaceTime: 0,

            onEnable: function() {
                this.startInterval();
            },

            onDisable: function() {
                if (this.interval) {
                    this.clearInterval(this.interval);
                }
                this.interval = null;
                this.lastPosition = null;
                this.lastVelocity = [0, 0, 0];
                this.airTicks = 0;
            },

            startInterval: function() {
                if (this.interval) {
                    this.clearInterval(this.interval);
                }
                const delay = 1;
                this.interval = this.setInterval( () => {
                    if (this.enabled) {
                        this.tryPlaceBlock();
                    }
                }
                , delay);
                this.tryPlaceBlock();
            },

            checkFeetBlock: function(pos) {
                if (!pos) {
                    return false;
                }
                const x = Math.floor(pos[0]);
                const y = Math.floor(pos[1] - 1);
                const z = Math.floor(pos[2]);
                const blockID = gameUtils.getBlockID(x, y, z);
                return blockID !== null && blockID !== 0;
            },

            findNearestBlockInRadius: function(pos, radius=7) {
                if (!pos) {
                    return null;
                }
                const px = Math.floor(pos[0]);
                const py = Math.floor(pos[1]);
                const pz = Math.floor(pos[2]);
                let nearestBlock = null;
                let minDistance = Infinity;
                const maxDistSq = radius * radius;

                for (let x = -radius; x <= radius; x++) {
                    for (let y = -radius; y <= radius; y++) {
                        for (let z = -radius; z <= radius; z++) {
                            if (x * x + y * y + z * z > maxDistSq)
                                continue;
                            const bx = px + x;
                            const by = py + y;
                            const bz = pz + z;
                            const blockID = gameUtils.getBlockID(bx, by, bz);
                            if (blockID && blockID !== 0) {
                                const dist = Math.sqrt(x * x + y * y + z * z);
                                if (dist < minDistance) {
                                    minDistance = dist;
                                    nearestBlock = [bx, by, bz];
                                }
                            }
                        }
                    }
                }
                return nearestBlock;
            },

            generatePathToPlayer: function(start, end) {
                if (!start || !end)
                    return [];
                const path = [];
                const ex = Math.floor(end[0]);
                const ey = Math.floor(end[1] - 1);
                const ez = Math.floor(end[2]);
                let x = start[0];
                let y = start[1];
                let z = start[2];

                while (y > ey) {
                    y--;
                    const blockID = gameUtils.getBlockID(x, y, z);
                    if (!blockID || blockID === 0) {
                        path.push([x, y, z]);
                    }
                }

                while (x !== ex || z !== ez) {
                    if (x !== ex) {
                        x += x < ex ? 1 : -1;
                        this.addSupportedPosToPath(path, x, y, z);
                    }
                    if (z !== ez) {
                        z += z < ez ? 1 : -1;
                        this.addSupportedPosToPath(path, x, y, z);
                    }
                }

                const hasEndPos = path.some(p => p[0] === ex && p[1] === ey && p[2] === ez);
                if (!hasEndPos) {
                    path.push([ex, ey, ez]);
                }
                return path;
            },

            addSupportedPosToPath: function(path, x, y, z) {
                let hasSupport = false;
                const dirs = [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];
                for (const [dx,dy,dz] of dirs) {
                    const bx = x + dx;
                    const by = y + dy;
                    const bz = z + dz;
                    const blockID = gameUtils.getBlockID(bx, by, bz);
                    if (blockID && blockID !== 0) {
                        hasSupport = true;
                        break;
                    }
                }
                path.push([x, y, z]);
            },

            tryPlaceBlock: function() {
                try {
                    if (this.isBuilding)
                        return;
                    this.isBuilding = true;

                    const playerEntity = gameUtils.getPlayerEntity();
                    if (!playerEntity?._blockItem || playerEntity._blockItem.typeObj?.type !== "CubeBlock") {
                        this.isBuilding = false;
                        return;
                    }

                    const playerPos = gameUtils.getPosition(1);
                    if (!playerPos) {
                        this.isBuilding = false;
                        return;
                    }

                    if (this.checkFeetBlock(playerPos)) {
                        this.airTicks = 0;
                        this.isBuilding = false;
                        return;
                    }

                    const nearestBlock = this.findNearestBlockInRadius(playerPos, 7);
                    if (!nearestBlock) {
                        this.airTicks++;
                        this.isBuilding = false;
                        return;
                    }

                    const path = this.generatePathToPlayer(nearestBlock, playerPos);
                    const uniquePath = [...new Set(path.map(p => JSON.stringify(p)))].map(JSON.parse);

                    uniquePath.forEach(pos => {
                        const [x,y,z] = pos;
                        const blockID = gameUtils.getBlockID(x, y, z);
                        if (!blockID || blockID === 0) {
                            this.placeAt(x, y, z);
                        }
                    }
                    );

                    this.lastPlaceTime = Date.now();
                    this.airTicks = 0;
                    this.isBuilding = false;
                } catch {
                    this.isBuilding = false;
                }
            },

            placeAt: function(x, y, z) {
                if (this.canPlaceBlock(x, y, z)) {
                    gameUtils.placeBlock([x, y, z]);
                    this.airTicks = 0;
                    this.lastPlaceTime = Date.now();
                    return true;
                }
                return false;
            },

            canPlaceBlock: function(x, y, z) {
                const dirs = [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];
                let hasSupport = false;
                for (const [dx,dy,dz] of dirs) {
                    const bx = x + dx;
                    const by = y + dy;
                    const bz = z + dz;
                    const blockID = gameUtils.getBlockID(bx, by, bz);
                    if (blockID && blockID !== 0) {
                        hasSupport = true;
                        break;
                    }
                }
                return hasSupport;
            }
        });
        client.modules['Bhop'] = new Module('Bhop','Di chuyển',{
            didJumpLastFrame: false,
            onEnable: function() {
                this.didJumpLastFrame = false;
                this.setLoop( () => {
                    const moveState = gameUtils.getMoveState(1)
                      , physState = gameUtils.getPhysState(1);
                    if (!moveState || !physState)
                        return;
                    if (this.didJumpLastFrame) {
                        moveState.jumping = false;
                        if (gameState.noa?.inputs?.state)
                            gameState.noa.inputs.state.jump = false;
                        this.didJumpLastFrame = false;
                    }
                    if (moveState.crouching || moveState.speed <= 0.05 || !physState.isOnGround())
                        return;
                    const isTouchscreen = gameState.impKey && gameState.noa.entities[gameState.impKey]?.receivesInputs?.hash?.[1]?.isTouchscreen;
                    if (isTouchscreen) {
                        moveState.jumping = true;
                    } else {
                        if (gameState.noa?.inputs?.state)
                            gameState.noa.inputs.state.jump = true;
                    }
                    this.didJumpLastFrame = true;
                }
                );
            },
            onDisable: function() {
                const moveState = gameUtils.getMoveState(1);
                if (moveState)
                    moveState.jumping = false;
                if (gameState.noa?.inputs?.state)
                    gameState.noa.inputs.state.jump = false;
                this.didJumpLastFrame = false;
            }
        });
        client.modules['Không bị chậm '] = new Module('Không bị chậm ','Di chuyển',{
            onEnable: () => {
                if (gameState.playerData)
                    gameState.playerData.crouchingSpeed = 7;
            }
            ,
            onDisable: () => {
                if (gameState.playerData)
                    gameState.playerData.crouchingSpeed = 2;
            }
        });
        client.modules['Tự động chạy nước rút'] = new Module('Tự động chạy nước rút','Di chuyển',{
            onEnable: () => {
                if (gameState.playerData)
                    gameState.playerData.walkingSpeed = 7;
            }
            ,
            onDisable: () => {
                if (gameState.playerData)
                    gameState.playerData.walkingSpeed = 6;
            }
        });
        client.modules['Name tags'] = new Module('Name tags','Hiển thị',{
            onEnable: function() {
                this.lastUpdate = 0;
            },
            onTick: function() {
                let now = Date.now();
                if (now - (this.lastUpdate || 0) < 3000)
                    return;
                this.lastUpdate = now;
                if (!gameState.entityList || !gameState.Lion?.scene)
                    return;
                for (let entities of Object.values(gameState.entityList)) {
                    if (entities) {
                        for (let entity of Object.values(entities)) {
                            if (entity?.lobbyLeaderboardValues) {
                                Object.defineProperty(entity, 'hasPriorityNametag', {
                                    get: () => true,
                                    set(val) {},
                                    configurable: true
                                });
                                Object.defineProperty(entity, 'canSee', {
                                    get: () => true,
                                    set(val) {},
                                    configurable: true
                                });
                            }
                        }
                    }
                }
                gameState.Lion.scene.meshes.forEach(mesh => {
                    if (mesh?.id?.includes?.('NameTag')) {
                        Object.defineProperty(mesh, '_isVisible', {
                            get: () => true,
                            set(val) {},
                            configurable: true
                        });
                        Object.defineProperty(mesh, 'renderingGroupId', {
                            get: () => 3,
                            set(val) {},
                            configurable: true
                        });
                    }
                }
                );
            }
        });
        client.modules['Không thay đổi FOV'] = new Module('Không thay đổi FOV','Hiển thị',{
            _baseFOV: 160 / 83.33333333333333333333,
            _originalGetViewMatrix: null,
            _camera: null,
            settings: {
                'Góc nhìn': {
                    type: 'slider',
                    min: 60,
                    max: 160,
                    step: 1,
                    value: 160,
                    onChange: function(fov) {
                        client.modules['Không thay đổi FOV']._baseFOV = fov / 8.333333333333333333333;

                    }
                }
            },
            onEnable: function() {
                this._baseFOV = this.settings['Góc nhìn'].value / 83.33333333333333333333;
                this._hookViewMatrix();
            },
            _hookViewMatrix: function() {
                if (!gameState.Lion?.scene?.activeCamera) {
                    setTimeout( () => this._hookViewMatrix(), 100);
                    return;
                }

                this._camera = gameState.Lion.scene.activeCamera;

                if (!this._originalGetViewMatrix) {
                    this._originalGetViewMatrix = this._camera._getViewMatrix;
                }

                const self = this;
                this._camera._getViewMatrix = function() {
                    this.fov = self._baseFOV;
                    return self._originalGetViewMatrix.call(this);
                }
                ;

                this._camera.fov = this._baseFOV;
            },
            onTick: function() {
                if (!this.enabled)
                    return;

                if (gameState.Lion?.scene?.activeCamera !== this._camera) {
                    this._hookViewMatrix();
                }

                if (this._camera) {
                    this._camera.fov = this._baseFOV;
                }
            },
            onDisable: function() {
                if (this._camera && this._originalGetViewMatrix) {
                    this._camera._getViewMatrix = this._originalGetViewMatrix;
                    this._camera.fov = 1.0;
                }

                this._camera = null;
                this._originalGetViewMatrix = null;
            }
        });
        client.modules['Tọa độ'] = new Module('Tọa độ','Hiển thị',{
            onEnable: function() {
                this.setInterval( () => {
                    if (!gameState.bloxd?.entityNames) {
                        return;
                    }
                    const players = gameUtils.playerList;
                    players.forEach(id => {
                        const entity = gameState.bloxd.entityNames[id];
                        if (!entity) {
                            return;
                        }
                        const pos = gameUtils.getPosition(id);
                        if (!pos) {
                            return;
                        }
                        let name = entity.entityName;
                        if (name.includes(' (')) {
                            name = name.split(' (')[0];
                        }
                        const x = Math.floor(pos[0]);
                        const y = Math.floor(pos[1]);
                        const z = Math.floor(pos[2]);
                        entity.entityName = name + ' (' + x + ', ' + y + ', ' + z + ')';
                    }
                    );
                }
                , 100);
            },
            onDisable: function() {
                if (!gameState.bloxd?.entityNames) {
                    return;
                }
                gameUtils.playerList.forEach(id => {
                    const entity = gameState.bloxd.entityNames[id];
                    if (entity && entity.entityName.includes(' (')) {
                        entity.entityName = entity.entityName.split(' (')[0];
                    }
                }
                );
            }
        });
        client.modules['Ban đêm'] = new Module('Ban đêm','Hiển thị',{
            _origClearColor: null,
            _skyboxMesh: null,
            _findSkybox: function() {
                if (!gameState.noa)
                    return null;
                for (let i = 0; i < 10000; i++) {
                    try {
                        const meshState = gameState.noa.entities.getState(i, "mesh");
                        if (meshState && meshState.mesh && (meshState.mesh.id === "skyBox" || meshState.mesh.name === "skyBox" || (meshState.mesh.id && meshState.mesh.id.toLowerCase().includes("sky")))) {
                            return meshState.mesh;
                        }
                    } catch (e) {}
                }
                try {
                    const rendering = utils.values(gameState.rendering);
                    if (rendering) {
                        const scene = rendering.find(val => val && val.meshes && Array.isArray(val.meshes));
                        if (scene) {
                            const sky = scene.meshes.find(m => m && m.name && m.name.toLowerCase().includes("sky"));
                            if (sky)
                                return sky;
                        }
                    }
                } catch (e) {}
                return null;
            },
            onEnable: function() {
                this._origClearColor = null;
                this._skyboxMesh = null;
            },
            onTick: function() {
                try {
                    const scene = gameState.noa?.rendering?.getScene ? gameState.noa.rendering.getScene() : gameState.noa?.rendering?.scene;
                    if (scene) {
                        if (!this._origClearColor && scene.clearColor) {
                            this._origClearColor = {
                                r: scene.clearColor.r,
                                g: scene.clearColor.g,
                                b: scene.clearColor.b
                            };
                        }
                        if (scene.clearColor) {
                            scene.clearColor.r = 0.05;
                            scene.clearColor.g = 0.05;
                            scene.clearColor.b = 0.1;
                        }
                        if (scene.fogMode !== undefined)
                            scene.fogMode = 0;
                    }
                    this._skyboxMesh = this._findSkybox();
                    if (this._skyboxMesh) {
                        this._skyboxMesh.isVisible = false;
                    }
                } catch (e) {}
            },
            onDisable: function() {
                try {
                    const scene = gameState.noa?.rendering?.getScene ? gameState.noa.rendering.getScene() : gameState.noa?.rendering?.scene;
                    if (scene && this._origClearColor && scene.clearColor) {
                        scene.clearColor.r = this._origClearColor.r;
                        scene.clearColor.g = this._origClearColor.g;
                        scene.clearColor.b = this._origClearColor.b;
                    }
                    if (this._skyboxMesh) {
                        this._skyboxMesh.isVisible = true;
                        this._skyboxMesh = null;
                    }
                    this._origClearColor = null;
                } catch (e) {}
            }
        });
        client.modules['Tracer'] = new Module('Tracer','Hiển thị',{
            _canvas: null,
            onEnable: function() {
                const oldCanvas = document.getElementById('bone-tracers-canvas');
                if (oldCanvas) {
                    oldCanvas.remove();
                }
                this._canvas = document.createElement('canvas');
                this._canvas.id = 'bone-tracers-canvas';
                this._canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9997;';
                document.body.appendChild(this._canvas);
            },
            onTick: function() {
                try {
                    if (!this._canvas || this._canvas.parentNode !== document.body) {
                        const oldCanvas = document.getElementById('bone-tracers-canvas');
                        if (oldCanvas) {
                            oldCanvas.remove();
                        }
                        this._canvas = document.createElement('canvas');
                        this._canvas.id = 'bone-tracers-canvas';
                        this._canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9997;';
                        document.body.appendChild(this._canvas);
                    }

                    if (this._canvas.width !== window.innerWidth || this._canvas.height !== window.innerHeight) {
                        this._canvas.width = window.innerWidth;
                        this._canvas.height = window.innerHeight;
                    }

                    const ctx = this._canvas.getContext('2d');
                    ctx.save();
                    ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
                    ctx.lineWidth = 1.5;
                    ctx.strokeStyle = '#ff0000';
                    ctx.shadowColor = '#ff0000';
                    ctx.shadowBlur = 8;

                    const playerList = gameUtils.playerList;
                    if (!playerList || playerList.length === 0) {
                        ctx.restore();
                        return;
                    }

                    let startX = window.innerWidth / 2;
                    let startY = window.innerHeight / 2;

                    playerList.forEach(playerId => {
                        try {
                            const playerPos = gameUtils.getPosition(playerId);
                            if (!playerPos)
                                return;

                            const screenPos = worldToScreen([playerPos[0], playerPos[1] + 1.6, playerPos[2]]);
                            if (!screenPos)
                                return;

                            ctx.beginPath();
                            ctx.moveTo(startX, startY);
                            ctx.lineTo(screenPos.x, screenPos.y);
                            ctx.stroke();
                        } catch (e) {}
                    }
                    );

                    ctx.restore();
                } catch (e) {}
            },
            onDisable: function() {
                const oldCanvas = document.getElementById('bone-tracers-canvas');
                if (oldCanvas) {
                    oldCanvas.remove();
                }
                this._canvas = null;
            }
        });
        client.modules['Hoạt ảnh'] = new Module('Hoạt ảnh','Hiển thị',{
            originalSetFirstPersonMeshPosition: null,
            onEnable: function() {
                const playerEntity = gameUtils.getPlayerEntity();
                if (!playerEntity?._standardItem)
                    return;
                const itemProto = Object.getPrototypeOf(playerEntity._standardItem);
                if (!itemProto || !itemProto.setFirstPersonMeshPosition)
                    return;
                this.originalSetFirstPersonMeshPosition = itemProto.setFirstPersonMeshPosition;
                const self = this;
                itemProto.setFirstPersonMeshPosition = function(time) {
                    if (self.enabled) {
                        const mesh = this.firstPersonMesh
                          , state = this.heldItemState;
                        if (!mesh || !state)
                            return;
                        const Vector3 = mesh.position.constructor;
                        const x = 0.23 + this.firstPersonPosOffset.x
                          , y = -0.2 + this.firstPersonPosOffset.y
                          , z = 0.3 + this.firstPersonPosOffset.z;
                        const rotation = new Vector3(0.4,0.7,0.3).add(this.firstPersonRotation);
                        const swingTime = time - state._lastSwingStart
                          , swingDuration = state.swingDuration;
                        if (swingTime < swingDuration) {
                            const progress = Math.sin(Math.pow(swingTime / swingDuration, 0.35) * Math.PI);
                            const a = 0.26
                              , b = 1.07;
                            const rx = -0.3 * progress
                              , ry = -0.4 * progress
                              , rz = 0.72 * progress;
                            mesh.rotation = new Vector3(rotation.x + rx,rotation.y + ry,rotation.z + rz);
                            const dx = (Math.sin(rotation.z + rz + b) - Math.sin(rotation.z + b)) * a
                              , dy = (Math.cos(rotation.z + rz + b) - Math.cos(rotation.z + b)) * a;
                            mesh.position.x = x - dx;
                            mesh.position.y = y + dy;
                            mesh.position.z = z;
                        } else {
                            mesh.rotation = rotation;
                            mesh.position = new Vector3(x,y,z);
                        }
                        if (this.typeObj.type === 'CubeBlock' || this.typeObj.type === 'SlabBlock') {
                            mesh.rotation.z = 0;
                        }
                    } else {
                        self.originalSetFirstPersonMeshPosition.call(this, time);
                    }
                }
                ;
            },
            onDisable: function() {
                const playerEntity = gameUtils.getPlayerEntity();
                if (this.originalSetFirstPersonMeshPosition && playerEntity?._standardItem) {
                    const itemProto = Object.getPrototypeOf(playerEntity._standardItem);
                    if (itemProto)
                        itemProto.setFirstPersonMeshPosition = this.originalSetFirstPersonMeshPosition;
                }
                this.originalSetFirstPersonMeshPosition = null;
            }
        });
        client.modules['Xoay vat pham'] = new Module('Xoay vat pham','Hiển thị',{
            originalSetFirstPersonMeshPosition: null,
            onEnable: function() {
                const playerEntity = gameUtils.getPlayerEntity();
                if (!playerEntity?._standardItem)
                    return;
                const itemProto = Object.getPrototypeOf(playerEntity._standardItem);
                if (!itemProto || !itemProto.setFirstPersonMeshPosition)
                    return;
                this.originalSetFirstPersonMeshPosition = itemProto.setFirstPersonMeshPosition;
                const self = this;
                itemProto.setFirstPersonMeshPosition = function(time) {
                    self.originalSetFirstPersonMeshPosition.call(this, time);
                    if (self.enabled) {
                        const mesh = this.firstPersonMesh;
                        if (!mesh)
                            return;
                        mesh.rotation.y = performance.now() / 60;
                    }
                }
                ;
            },
            onDisable: function() {
                const playerEntity = gameUtils.getPlayerEntity();
                if (this.originalSetFirstPersonMeshPosition && playerEntity?._standardItem) {
                    const itemProto = Object.getPrototypeOf(playerEntity._standardItem);
                    if (itemProto)
                        itemProto.setFirstPersonMeshPosition = this.originalSetFirstPersonMeshPosition;
                }
                this.originalSetFirstPersonMeshPosition = null;
            }
        });
        client.modules['ESP'] = new Module('ESP','Hiển thị',{
            onEnable: () => {
                if (!espInterval) {
                    espInterval = setInterval( () => setRenderingGroup(true), 300);
                    setRenderingGroup(true);
                }
            }
            ,
            onDisable: () => {
                if (espInterval) {
                    clearInterval(espInterval);
                    espInterval = null;
                    setRenderingGroup(false);
                }
            }
        });
        client.modules['Trình chỉnh sửa HUD'] = new Module('Trình chỉnh sửa HUD','HUD',{
            type: 'action',
            overlayEl: null,
            dragElements: [],
            activeDrag: null,
            offsetX: 0,
            offsetY: 0,
            onEnable: function() {
                if (!this.overlayEl) {
                    this.overlayEl = document.createElement('div');
                    this.overlayEl.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:10002;display:none;align-items:center;justify-content:center;flex-direction:column;color:white;font-size:30px;font-family:var(--font-main);pointer-events:auto;backdrop-filter:blur(3px);';
                    this.overlayEl.innerHTML = '<div style="font-weight:bold;margin-bottom:10px;">HUD 编辑器</div><div style="font-size:14px;color:#ccc;">拖拽HUD元素调整位置。右键任意位置保存并关闭。</div>';
                    ui.shadowRoot.appendChild(this.overlayEl);
                    this.overlayEl.addEventListener('contextmenu', event => {
                        event.preventDefault();
                        this.closeEditor();
                    }
                    );
                }
                this.overlayEl.style.display = 'flex';
                this.dragElements = [];
                [ui.hudInfo, ui.keystrokes, ui.arrayList].forEach(el => {
                    if (el) {
                        el.style.border = '2px dashed #36A3FF';
                        el.style.pointerEvents = 'auto';
                        el.style.cursor = 'move';
                        el.dataset.origZ = el.style.zIndex || '9998';
                        el.style.zIndex = '10005';
                        const onMouseDown = event => {
                            this.activeDrag = el;
                            const rect = el.getBoundingClientRect();
                            this.offsetX = event.clientX - rect.left;
                            this.offsetY = event.clientY - rect.top;
                            event.stopPropagation();
                        }
                        ;
                        el._hudEditMd = onMouseDown;
                        el.addEventListener('mousedown', onMouseDown);
                        this.dragElements.push(el);
                    }
                }
                );
                this._mm = event => {
                    if (this.activeDrag) {
                        this.activeDrag.style.left = event.clientX - this.offsetX + 'px';
                        this.activeDrag.style.top = event.clientY - this.offsetY + 'px';
                        this.activeDrag.style.right = 'auto';
                        this.activeDrag.style.bottom = 'auto';
                        this.activeDrag.style.transform = 'none';
                    }
                }
                ;
                this._mu = () => {
                    this.activeDrag = null;
                }
                ;
                window.addEventListener('mousemove', this._mm);
                window.addEventListener('mouseup', this._mu);
            },
            closeEditor: function() {
                if (this.overlayEl)
                    this.overlayEl.style.display = 'none';
                this.dragElements.forEach(el => {
                    el.style.border = '';
                    el.style.pointerEvents = 'none';
                    el.style.cursor = 'default';
                    el.style.zIndex = el.dataset.origZ;
                    if (el._hudEditMd) {
                        el.removeEventListener('mousedown', el._hudEditMd);
                        delete el._hudEditMd;
                    }
                }
                );
                if (this._mm)
                    window.removeEventListener('mousemove', this._mm);
                if (this._mu)
                    window.removeEventListener('mouseup', this._mu);
            },
            onDisable: function() {}
        });
        client.modules['Làm mờ'] = new Module('Làm mờ','HUD',{
            enabled: true
        });
        client.modules['HUD mục tiêu'] = new Module('HUD mục tiêu','Hiển thị',{
            hudEl: null,
            nameEl: null,
            barEl: null,
            hpTextEl: null,
            onEnable: function() {
                if (!this.hudEl) {
                    this.hudEl = document.createElement('div');
                    this.hudEl.className = 'bone-target-hud';
                    this.hudEl.innerHTML = '<div class="bone-target-hud-inner"><div class="bone-target-hud-name"></div><div class="bone-target-hud-bar-bg"><div class="bone-target-hud-bar"></div></div><div class="bone-target-hud-hp-text"></div></div>';
                    ui.shadowRoot.appendChild(this.hudEl);
                    this.nameEl = this.hudEl.querySelector('.bone-target-hud-name');
                    this.barEl = this.hudEl.querySelector('.bone-target-hud-bar');
                    this.hpTextEl = this.hudEl.querySelector('.bone-target-hud-hp-text');
                }
            },
            onDisable: function() {
                if (this.hudEl)
                    this.hudEl.style.display = 'none';
            },
            onTick: function() {
                if (!this.hudEl)
                    return;
                const playerPos = gameUtils.getPosition(1);
                if (!playerPos) {
                    this.hudEl.style.display = 'none';
                    return;
                }
                const players = gameUtils.playerList;
                let target = null
                  , minDist = Infinity;
                wRmA: for (const playerId of players) {
                    const lifeState = gameState.noa.entities.getState(playerId, 'genericLifeformState');
                    if (lifeState && !lifeState.isAlive)
                        continue wRmA;
                    const targetPos = gameUtils.getPosition(playerId);
                    if (!targetPos)
                        continue wRmA;
                    const dist = Math.hypot(targetPos[0] - playerPos[0], targetPos[1] - playerPos[1], targetPos[2] - playerPos[2]);
                    if (dist < minDist && dist < 30) {
                        minDist = dist;
                        target = {
                            id: playerId,
                            pos: targetPos
                        };
                    }
                }
                if (!target) {
                    this.hudEl.style.display = 'none';
                    return;
                }
                const screenPos = worldToScreen([target.pos[0], target.pos[1] + 1, target.pos[2]]);
                if (!screenPos) {
                    this.hudEl.style.display = 'none';
                    return;
                }
                const health = getEntityHealth(target.id);
                const healthPercent = Math.max(0, Math.min(100, health * 100));
                const name = getEntityName(target.id);
                let hpBarColor;
                if (healthPercent < 25) {
                    hpBarColor = '#962D2D';
                } else if (healthPercent < 50) {
                    hpBarColor = '#D99A48';
                } else {
                    hpBarColor = '#36A37A';
                }
                this.nameEl.textContent = name;
                this.barEl.style.width = healthPercent + '%';
                this.barEl.style.backgroundColor = hpBarColor;
                this.hpTextEl.textContent = Math.round(healthPercent) + 'Hp';
                this.hudEl.style.display = 'block';
                this.hudEl.style.left = screenPos.x + 30 + 'px';
                this.hudEl.style.top = screenPos.y - 20 + 'px';
            }
        });
        client.modules['Watermark (Logo)'] = new Module('Watermark (Logo)','HUD',{
            enabled: true,
            onEnable: () => {
                if (ui.watermark)
                    ui.watermark.style.display = 'block';
                if (ui.categoriesContainer)
                    ui.categoriesContainer.style.display = 'flex';
            }
            ,
            onDisable: () => {
                if (ui.watermark)
                    ui.watermark.style.display = 'none';
                if (ui.categoriesContainer)
                    ui.categoriesContainer.style.display = 'none';
            }
        });
        client.modules['Danh sách chức năng'] = new Module('Danh sách chức năng','HUD',{
            enabled: true,
            onEnable: () => {
                if (ui.arrayList)
                    ui.arrayList.style.display = 'flex';
            }
            ,
            onDisable: () => {
                if (ui.arrayList)
                    ui.arrayList.style.display = 'none';
            }
        });
        client.modules['Tốc độ khung hình/Độ trễ'] = new Module('Tốc độ khung hình/Độ trễ','HUD',{
            enabled: false,
            onEnable: () => {
                if (ui.hudInfo)
                    ui.hudInfo.style.display = 'flex';
            }
            ,
            onDisable: () => {
                if (ui.hudInfo)
                    ui.hudInfo.style.display = 'none';
            }
            ,
            onTick: function() {
                if (!ui.hudInfo)
                    return;
                let ping = 0;
                const pingModule = moduleLoader(Object.keys(moduleLoader.m).find(key => moduleLoader.m[key].toString().includes('colyseusPingInfo')));
                const pingObj = Object.values(pingModule).find(val => val?.colyseusPingInfo);
                if (pingObj && pingObj.colyseusPingInfo.end && pingObj.colyseusPingInfo.start) {
                    ping = Math.round((pingObj.colyseusPingInfo.end - pingObj.colyseusPingInfo.start) * 10) / 10;
                }
                ui.shadowRoot.getElementById('bone-fps').textContent = `FPS: ${stats.currentFps}`;
                ui.shadowRoot.getElementById('bone-ping').textContent = `Trì hoãn: ${ping}ms`;
            }
        });
        client.modules['Hiển thị phím bấm'] = new Module('Hiển thị phím bấm','HUD',{
            enabled: false,
            onEnable: () => {
                if (ui.keystrokes)
                    ui.keystrokes.style.display = 'flex';
            }
            ,
            onDisable: () => {
                if (ui.keystrokes)
                    ui.keystrokes.style.display = 'none';
            }
            ,
            onTick: function() {
                if (!ui.keystrokes)
                    return;
                const now = Date.now();
                stats.lClicks = stats.lClicks.filter(time => now - time < 1000);
                stats.rClicks = stats.rClicks.filter(time => now - time < 1000);
                ui.shadowRoot.getElementById('cps-lmb').textContent = `${stats.lClicks.length} CPS`;
                ui.shadowRoot.getElementById('cps-rmb').textContent = `${stats.rClicks.length} CPS`;
            }
        });
        client.modules['Đặt khối nhanh'] = new Module('Đặt khối nhanh','Thế giới',{
            lastPlace: 0,
            settings: {
                'Độ trễ': {
                    type: 'slider',
                    min: 0,
                    max: 100,
                    step: 10,
                    value: 0
                }
            },
            onTick: function() {
                if (!document.isRightMouseDown)
                    return;
                const now = Date.now();
                if (now - this.lastPlace >= this.settings['Độ trễ'].value) {
                    gameUtils.getPlayerEntity()?._blockItem?.placeBlock?.();
                    this.lastPlace = now;
                }
            }
        });
        client.modules['Phá khối nhanh'] = new Module('Phá khối nhanh','Thế giới',{
            originalHardness: {},
            applied: false,
            onEnable: function() {
                this.setInterval( () => {
                    if (this.applied)
                        return;
                    const gunClass = utils.values(moduleLoader.m).find(val => val.toString().includes('Gun:class'));
                    if (!gunClass)
                        return;
                    const gunKey = Object.keys(moduleLoader.m).find(key => moduleLoader.m[key] === gunClass);
                    const blocks = Object.values(Object.values(moduleLoader(gunKey)).find(val => typeof val === 'object'));
                    if (Object.keys(this.originalHardness).length === 0) {
                        blocks.forEach( (block, index) => {
                            if (block?.ttb)
                                this.originalHardness[index] = block.ttb;
                        }
                        );
                    }
                    blocks.forEach( (block, index) => {
                        if (block?.ttb && this.originalHardness[index])
                            block.ttb = this.originalHardness[index] / 2;
                    }
                    );
                    this.applied = true;
                }
                , 500);
            },
            onDisable: function() {
                if (this.applied) {
                    const gunClass = utils.values(moduleLoader.m).find(val => val.toString().includes('Gun:class'));
                    if (gunClass) {
                        const gunKey = Object.keys(moduleLoader.m).find(key => moduleLoader.m[key] === gunClass);
                        const blocks = Object.values(Object.values(moduleLoader(gunKey)).find(val => typeof val === 'object'));
                        blocks.forEach( (block, index) => {
                            if (block?.ttb && this.originalHardness[index])
                                block.ttb = this.originalHardness[index];
                        }
                        );
                    }
                }
                this.originalHardness = {};
                this.applied = false;
            }
        });
        client.modules['Bed Aura'] = new Module('Bed Aura','Thế giới',{
            bedPos: null,
            pathCache: [],
            isBreaking: false,
            onEnable() {
                this.setInterval( () => this.onTick(), 50);
            },
            onDisable() {
                this.isBreaking = false;
                this.pathCache = [];
                this.bedPos = null;
            },
            onTick() {
                if (!gameState.injected || this.isBreaking) {
                    return;
                }
                const playerEntity = gameUtils.getPlayerEntity();
                const breakingItem = playerEntity?._blockItem?.breakingItem;
                if (!breakingItem || breakingItem.attemptingToBreak) {
                    return;
                }
                const playerPos = gameUtils.getPosition(1);
                if (!playerPos) {
                    return;
                }
                if (this.bedPos) {
                    const blockId = gameUtils.getBlockID(this.bedPos[0], this.bedPos[1], this.bedPos[2]);
                    if (!gameUtils.getBlockName(blockId)?.toLowerCase().includes('bed')) {
                        this.bedPos = null;
                        this.pathCache = [];
                    }
                }
                if (!this.bedPos) {
                    const range = 6;
                    const x = Math.floor(playerPos[0]);
                    const y = Math.floor(playerPos[1] + 0.5);
                    const z = Math.floor(playerPos[2]);
                    _0x544155: for (let dx = -range; dx <= range; dx++) {
                        for (let dy = -range; dy <= range; dy++) {
                            for (let dz = -range; dz <= range; dz++) {
                                if (dx * dx + dy * dy + dz * dz > range * range) {
                                    continue;
                                }
                                const bx = x + dx;
                                const by = y + dy;
                                const bz = z + dz;
                                const blockId = gameUtils.getBlockID(bx, by, bz);
                                if (gameUtils.getBlockName(blockId)?.toLowerCase().includes('bed')) {
                                    this.bedPos = [bx, by, bz];
                                    this.pathCache = lineOfSight([x, y, z], this.bedPos);
                                    break _0x544155;
                                }
                            }
                        }
                    }
                }
                if (!this.bedPos || this.pathCache.length === 0) {
                    return;
                }
                let target = null;
                for (const pos of this.pathCache) {
                    const blockId = gameUtils.getBlockID(pos[0], pos[1], pos[2]);
                    if (blockId !== 0) {
                        const dist = Math.hypot(playerPos[0] - (pos[0] + 0.5), playerPos[1] - (pos[1] + 0.5), playerPos[2] - (pos[2] + 0.5));
                        if (dist <= 7) {
                            target = pos;
                            break;
                        }
                    }
                }
                if (!target) {
                    this.bedPos = null;
                    this.pathCache = [];
                    return;
                }
                this.breakBlock(target[0], target[1], target[2]);
            },
            breakBlock(x, y, z) {
                const pos = [Math.floor(x), Math.floor(y), Math.floor(z)];
                const playerEntity = gameUtils.getPlayerEntity();
                const breakingItem = playerEntity?._blockItem?.breakingItem;
                const blockItem = Object.values(playerEntity?._blockItem || {})[0];
                if (!breakingItem || !blockItem) {
                    return;
                }
                this.isBreaking = true;
                const key = Object.keys(blockItem)[25];
                const original = blockItem[key];
                const originalTargeted = breakingItem.targetedPosition;
                if (!key) {
                    this.isBreaking = false;
                    return;
                }
                blockItem[key] = {
                    position: new Float32Array(pos),
                    normal: [0, 1, 0]
                };
                breakingItem.targetedPosition = null;
                try {
                    breakingItem.breakBlock(Date.now());
                } catch (err) {}
                const posProxy = {
                    get: () => ({
                        position: new Float32Array(pos),
                        normal: [0, 1, 0]
                    }),
                    set: () => {}
                    ,
                    configurable: true
                };
                Object.defineProperty(blockItem, key, posProxy);
                Object.defineProperty(breakingItem, "targetedPosition", {
                    get: () => pos,
                    set: () => {}
                    ,
                    configurable: true
                });
                breakingItem.targetedStartTime = breakingItem.anyBreakingStartTime = Date.now();
                breakingItem.attemptingToBreak = true;
                const interval = setInterval( () => {
                    const blockId = gameUtils.getBlockID(pos[0], pos[1], pos[2]);
                    if (!this.enabled || blockId === 0) {
                        clearInterval(interval);
                        this.resetBreaking(breakingItem, blockItem, key, original, originalTargeted);
                        return;
                    }
                    try {
                        if (breakingItem.breakBlock(Date.now()) === false) {
                            clearInterval(interval);
                            this.resetBreaking(breakingItem, blockItem, key, original, originalTargeted);
                        }
                    } catch (err) {
                        clearInterval(interval);
                        this.resetBreaking(breakingItem, blockItem, key, original, originalTargeted);
                    }
                }
                , 16);
            },
            resetBreaking(breakingItem, blockItem, key, original, originalTargeted) {
                Object.defineProperty(blockItem, key, {
                    value: original,
                    writable: true,
                    configurable: true,
                    enumerable: true
                });
                Object.defineProperty(breakingItem, "targetedPosition", {
                    value: originalTargeted,
                    writable: true,
                    configurable: true,
                    enumerable: true
                });
                try {
                    breakingItem.resetTargetedBlock(Date.now());
                } catch (err) {}
                breakingItem.attemptingToBreak = false;
                this.isBreaking = false;
            }
        });
        client.modules['Dịch chuyển'] = new Module('Dịch chuyển','Thế giới',{
            queued: [],
            colyRoom: null,
            sendBytesName: null,
            originalSendBytes: null,
            hookedProto: null,
            onEnable: function() {
                if (!this.colyRoom) {
                    this.colyRoom = Object.values(gameState.bloxd.client.msgHandler)[0];
                    this.sendBytesName = findSendBytesMethod(this.colyRoom);
                }
                const proto = this.colyRoom && Object.getPrototypeOf(this.colyRoom);
                if (!this.colyRoom || !this.sendBytesName || !proto?.[this.sendBytesName])
                    return;
                if (!this.originalSendBytes || this.hookedProto !== proto) {
                    this.originalSendBytes = proto[this.sendBytesName];
                    this.hookedProto = proto;
                }
                proto[this.sendBytesName] = (...args) => {
                    if (this.enabled) {
                        this.queued.push(args);
                    } else {
                        return this.originalSendBytes.apply(this.colyRoom, args);
                    }
                }
                ;
            },
            onDisable: function() {
                if (this.originalSendBytes && this.hookedProto) {
                    for (const args of this.queued)
                        this.originalSendBytes.apply(this.colyRoom, args);
                    this.hookedProto[this.sendBytesName] = this.originalSendBytes;
                }
                this.queued = [];
            }
        });
        client.modules['Lấy đồ từ rương'] = new Module('Lấy đồ từ rương','Thế giới',{
            settings: {
                'Độ trễ': {
                    type: 'slider',
                    min: 0,
                    max: 100,
                    step: 1,
                    value: 0
                }
            },
            onEnable: function() {
                this.setLoop(async () => {
                    const inventory = gameState.noa.entities[gameState.impKey]?.inventory?.list?.[0]?.opWrapper;
                    if (!inventory)
                        return;
                    const chestInventory = Object.values(inventory).find(val => val?.items && val.numSlots && val !== inventory.playerInventory);
                    const playerInventory = inventory.playerInventory;
                    if (!chestInventory?.items || !playerInventory?.items)
                        return;
                    const Op = 51;
                    const dg = 999;
                    function getItemAmount(item) {
                        if (!item)
                            return 0;
                        const amount = item.amount;
                        return (typeof amount === "number" && Number.isFinite(amount)) ? amount : 1;
                    }
                    for (let i = 0; i < chestInventory.items.length; i++) {
                        await new Promise(resolve => setTimeout(resolve, this.settings['Độ trễ'].value));
                        const item = chestInventory.items[i];
                        if (item) {
                            if (item.typeObj?.stackable) {
                                let remainingCount = getItemAmount(item);
                                const itemName = item.name;
                                for (let j = 0; j < 46 && remainingCount > 0; j++) {
                                    const playerItem = playerInventory.items[j];
                                    if (!playerItem || playerItem.name !== itemName)
                                        continue;
                                    const currentStack = getItemAmount(playerItem);
                                    if (currentStack >= dg)
                                        continue;
                                    const moveCount = Math.min(dg - currentStack, remainingCount);
                                    if (moveCount > 0) {
                                        inventory.moveItemIntoIdxsClient(j, j + 1, Op + i, moveCount);
                                        remainingCount -= moveCount;
                                        if (remainingCount <= 0)
                                            break;
                                    }
                                }
                            }
                            for (let j = 0; j < 46; j++) {
                                if (!playerInventory.items[j]) {
                                    inventory.swapPosClient(51 + i, j);
                                    break;
                                }
                            }
                        }
                    }
                }
                );
            }
        });
        client.modules['Quản lý ba lô'] = new Module('Quản lý ba lô','Thế giới',{
            settings: {
                'Độ trễ': {
                    type: 'slider',
                    min: 0,
                    max: 100,
                    step: 1,
                    value: 0
                }
            },
            interval: null,
            _mpqz: null,
            getWrapper: function() {
                try {
                    return gameState.noa.entities[gameState.impKey]?.inventory?.list?.[0]?.opWrapper ?? null;
                } catch {
                    return null;
                }
            },
            getMaterialRank: function(item) {
                if (!item?.name)
                    return -1;
                const rank = {
                    Wood: 0,
                    Stone: 1,
                    Iron: 2,
                    Gold: 3,
                    Diamond: 4,
                    Knight: 5
                };
                const mat = Object.keys(rank).find(k => item.name.includes(k));
                return mat ? rank[mat] : -1;
            },
            cleanInventory: function(wrapper) {
                if (!wrapper || !wrapper.playerInventory || !wrapper.playerInventory.items)
                    return;
                const inv = wrapper.playerInventory;
                const items = inv.items;
                const trash = ["Seeds", "Sapling", "Mushroom", "Empty Bottle"];
                const armor = {
                    Helmet: 46,
                    Chestplate: 47,
                    Gauntlets: 48,
                    Leggings: 49,
                    Boots: 50
                };

                for (let i = 0; i <= 45; i++) {
                    const it = items[i];
                    if (it && trash.some(t => it.name.includes(t))) {
                        wrapper.removeItemClient(i, it.amount, true);
                    }
                }

                for (let i = 0; i <= 45; i++) {
                    const it = items[i];
                    if (!it)
                        continue;
                    const armType = Object.keys(armor).find(k => it.name.includes(k));
                    const matRank = this.getMaterialRank(it);
                    if (!armType || matRank === -1)
                        continue;
                    const armSlot = armor[armType];
                    const equip = items[armSlot];
                    const equipRank = equip ? this.getMaterialRank(equip) : -1;
                    if (!equip || matRank > equipRank) {
                        wrapper.swapPosClient(i, armSlot);
                    } else {
                        wrapper.removeItemClient(i, 1, true);
                    }
                }

                const getItemSlots = function(filter) {
                    const slots = [];
                    for (let i = 0; i <= 45; i++) {
                        if (items[i] && filter(items[i]))
                            slots.push(i);
                    }
                    return slots;
                };

                const setBestItem = function(name, targetSlot) {
                    const slots = getItemSlots(function(it) {
                        return it.name.includes(name);
                    });
                    if (!slots.length)
                        return;
                    let best = -1
                      , maxRank = -1;
                    for (const s of slots) {
                        const r = this.getMaterialRank(items[s]);
                        if (r > maxRank) {
                            maxRank = r;
                            best = s;
                        }
                    }
                    if (best !== -1 && (!items[targetSlot] || !items[targetSlot].name.includes(name))) {
                        wrapper.swapPosClient(best, targetSlot);
                    }
                    for (const s of slots) {
                        if (s !== targetSlot && items[s]?.name.includes(name)) {
                            wrapper.removeItemClient(s, 1, true);
                        }
                    }
                }
                .bind(this);

                setBestItem("Sword", 0);
                setBestItem("Pickaxe", 2);
                setBestItem("Bow", 3);

                const bread = getItemSlots(function(it) {
                    return it.name.includes("Bread");
                });
                if (bread.length)
                    wrapper.swapPosClient(bread[0], 8);

                let plankCnt = 0
                  , stoneCnt = 0;
                const planks = getItemSlots(function(it) {
                    return it.name.includes("Maple Wood Planks");
                });
                const stones = getItemSlots(function(it) {
                    return it.name.includes("Messy Stone");
                });
                planks.forEach(function(s) {
                    plankCnt += items[s].amount || 1;
                });
                stones.forEach(function(s) {
                    stoneCnt += items[s].amount || 1;
                });

                if (plankCnt >= stoneCnt) {
                    if (planks.length && (!items[1] || !items[1].name.includes("Maple Wood Planks"))) {
                        wrapper.swapPosClient(planks[0], 1);
                    }
                    if (stones.length && (!items[9] || !items[9].name.includes("Messy Stone"))) {
                        wrapper.swapPosClient(stones[0], 9);
                    }
                } else {
                    if (stones.length && (!items[1] || !items[1].name.includes("Messy Stone"))) {
                        wrapper.swapPosClient(stones[0], 1);
                    }
                    if (planks.length && (!items[9] || !items[9].name.includes("Maple Wood Planks"))) {
                        wrapper.swapPosClient(planks[0], 9);
                    }
                }

                const stackTypes = ["Maple Wood Planks", "Messy Stone"];
                for (const type of stackTypes) {
                    const stacks = getItemSlots(function(it) {
                        return it.name.includes(type) && it.typeObj?.stackable;
                    });
                    if (stacks.length <= 1)
                        continue;
                    const tgt = stacks[0];
                    for (let i = 1; i < stacks.length; i++) {
                        const s = stacks[i];
                        if (!items[s])
                            continue;
                        try {
                            wrapper.moveItemIntoIdxsClient(tgt, tgt + 1, s, items[s].amount);
                        } catch {
                            wrapper.swapPosClient(s, tgt);
                        }
                    }
                }
            },
            onEnable: function() {
                if (this.interval)
                    return;
                const wrap = this.getWrapper();
                if (!wrap)
                    return;
                this.cleanInventory(wrap);
                this.interval = setInterval(function() {
                    const w = this.getWrapper();
                    if (w)
                        this.cleanInventory(w);
                }
                .bind(this), this.settings['Trì hoãn'].value || 100);
            },
            onDisable: function() {
                if (this.interval) {
                    clearInterval(this.interval);
                    this.interval = null;
                }
                this._mpqz = null;
            },
            _Ednl: null,
            _npqz: function(b) {
                this._mpqz = b;
            },
            _Hdqz: async function() {},
            _Idqz: function() {
                return false;
            },
            _Jdqz: function() {},
            _Kdqz: function() {}
        });
        client.modules['Tài khoản mới'] = new Module('Tài khoản mới','Thế giới',{
            type: 'action',
            onEnable: function() {
                if (window.confirm('Bạn có chắc chắn muốn đặt lại phiên làm việc và tạo tài khoản mới không?？')) {
                    const cookies = document.cookie.split(';');
                    for (let i = 0; i < cookies.length; i++) {
                        const cookie = cookies[i];
                        const eqPos = cookie.indexOf('=');
                        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
                        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
                    }
                    location.reload();
                }
            }
        });
        function gameLoop() {
            stats.fpsCount++;
            let now = performance.now();
            if (now - stats.lastFpsTime >= 1000) {
                stats.currentFps = stats.fpsCount;
                stats.fpsCount = 0;
                stats.lastFpsTime = now;
            }
            ui.updateHUD();
            if (gameState.injected) {
                utils.values(client.modules).forEach(module => {
                    if (module.enabled && module.onTick) {
                        module.onTick();
                    }
                }
                );
            }
            requestAnimationFrame(gameLoop);
        }
        requestAnimationFrame(gameLoop);
    }
    registerModules();
    initKeyReversalCheck();
    ui.init();
    setupInjectionObserver();
}
)();