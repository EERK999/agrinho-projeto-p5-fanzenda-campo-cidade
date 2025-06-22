// sketch.js

let player;
let speed = 3;
let collisionZones = [];
let mountainData = [];
let forestData = [];
let nearTruck = false;

let inventory = [];
let selectedSlot = 0;
const INVENTORY_SIZE = 6;

let plantedSeeds = [];
let harvestedItems = [];
let starterSeedMessage = null;
let starterSeedTime = 0;
//catalogo de sementes
const seedCatalog = [
  { id: 'milho', emoji: '🌽', name: 'Milho', price: 3 },
  { id: 'trigo', emoji: '🌾', name: 'Trigo', price: 2 },
  { id: 'cenoura', emoji: '🥕', name: 'Cenoura', price: 4 },
  { id: 'tomate', emoji: '🍅', name: 'Tomate', price: 5 },
  { id: 'batata', emoji: '🥔', name: 'Batata', price: 4 },
  { id: 'alho', emoji: '🧄', name: 'Alho', price: 3 },
  { id: 'morango', emoji: '🍓', name: 'Morango', price: 6 }
];
//canvas e afins
function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.position(0, 0);
  canvas.style("z-index", "0");
  canvas.elt.setAttribute('tabindex', '0');
  canvas.elt.focus();

  textAlign(CENTER, CENTER);
  textFont("Arial");
  player = createVector(width / 2, height / 2 + 20);

  generateMountainData();
  generateForestData();
  setupCollisionZones();
  noLoop();
}
//funções de desenho abaixo
function draw() {
  background('#C9FBA6');
  drawRivers();
  drawTreeLineOverlay();
  drawTrees();
  drawMountains();
  drawHouse();
  drawTruck();
  handleMovement();
  drawPlayer();
  checkTruckProximity();
  drawTruckHint();
  drawPlantedSeeds();
  drawStarterSeedMessage();
}

function drawStarterSeedMessage() {
  if (!starterSeedMessage) return;
  const now = millis();
  if (now - starterSeedTime > 3000) {
    starterSeedMessage = null;
    return;
  }
  fill(0);
  textSize(18);
  text(starterSeedMessage, width / 2, 100);
}

function drawPlantedSeeds() {
  const now = millis();
  for (let seed of plantedSeeds) {
    const age = now - seed.plantedAt;
    let stageEmoji = age < 3000 ? '🌱' : age < 6000 ? '🌿' : seed.emoji;
    textSize(24);
    text(stageEmoji, seed.x, seed.y);
  }
}
//verificção de click
function mousePressed() {
  const shopEl = document.getElementById("shop");
  if (mouseY < 60 || (shopEl && !shopEl.classList.contains("hidden"))) return;

  const now = millis();
  for (let i = 0; i < plantedSeeds.length; i++) {
    const seed = plantedSeeds[i];
    if (dist(mouseX, mouseY, seed.x, seed.y) < 20 && now - seed.plantedAt > 6000) {
      const harvested = plantedSeeds.splice(i, 1)[0];
      harvestedItems.push(harvested);
      saveHarvestedItems();
      updateHarvestHUD();

      const scoreEl = document.getElementById("score");
      if (scoreEl) {
        const current = parseInt(scoreEl.textContent.split(" ")[1]);
        scoreEl.innerText = `⭐ ${current + 1}`;
      }
      return;
    }
  }
//seleção de slot
  const selected = inventory[selectedSlot];
  if (!selected || selected.qty <= 0) return;

  plantedSeeds.push({
    id: selected.id,
    emoji: selected.emoji,
    plantedAt: millis(),
    x: mouseX,
    y: mouseY
  });
  selected.qty--;
  if (selected.qty === 0) inventory[selectedSlot] = null;
  updateInventoryUI();
  saveInventory();
}
//loja
function keyPressed() {
  if ((key === 'r' || key === 'R') && nearTruck) {
    const shop = document.getElementById("shop");
    if (shop) {
      shop.classList.toggle("hidden");
      renderShop();
    }
  }
  if (key >= '1' && key <= '6') {
    selectedSlot = parseInt(key) - 1;
    updateInventoryUI();
  }
}
//adicionador de items
function addToInventory(itemId) {
  const itemData = seedCatalog.find(seed => seed.id === itemId);
  if (!itemData) return;

  // Se já existe, incrementa
  for (let i = 0; i < inventory.length; i++) {
    if (inventory[i]?.id === itemId) {
      inventory[i].qty++;
      updateInventoryUI();
      saveInventory();
      return;
    }
  }

  for (let i = 0; i < inventory.length; i++) {
    if (!inventory[i]) {
      inventory[i] = { id: itemId, emoji: itemData.emoji, qty: 1 };
      updateInventoryUI();
      saveInventory();
      return;
    }
  }

  if (inventory.length < INVENTORY_SIZE) {
    inventory.push({ id: itemId, emoji: itemData.emoji, qty: 1 });
    updateInventoryUI();
    saveInventory();
  }
}

//atualiza inventario
function updateInventoryUI() {
  const slots = document.querySelectorAll(".inv-slot");
  for (let i = 0; i < INVENTORY_SIZE; i++) {
    const data = inventory[i];
    const slot = slots[i];
    if (slot) {
      slot.classList.toggle("selected", i === selectedSlot);
      slot.innerText = data ? `${data.emoji} ${data.qty}` : '';
    }
  }
}
function updateHarvestHUD() {
  const harvestedEl = document.getElementById("harvested");
  if (!harvestedEl) return;

  const summary = {};
  for (let item of harvestedItems) {
    if (!summary[item.id]) {
      summary[item.id] = { emoji: item.emoji, qty: 0 };
    }
    summary[item.id].qty++;
  }

  harvestedEl.innerHTML = Object.values(summary)
    .map(item => `${item.emoji} ${item.qty}`)
    .join(" ");
}


function setupInventoryUI() {
  const invContainer = document.getElementById("inventory");
  if (!invContainer) return;

  invContainer.innerHTML = '';

  for (let i = 0; i < INVENTORY_SIZE; i++) {
    const slot = document.createElement("div");
    slot.className = "inv-slot";
    if (i === selectedSlot) slot.classList.add("selected");

    slot.addEventListener("click", () => {
      selectedSlot = i;
      updateInventoryUI();
    });

    invContainer.appendChild(slot);
  }

  updateInventoryUI();
}
//vender
function sellAllItems() {
  let total = 0;

  for (let harvested of harvestedItems) {
    const catalogItem = seedCatalog.find(seed => seed.id === harvested.id);
    if (!catalogItem) continue;

    const sellPrice = catalogItem.price * 2;
    total += sellPrice;
  }

  harvestedItems = [];
  saveHarvestedItems();
  updateHarvestHUD();

  const moneyEl = document.getElementById("money");
  if (moneyEl) {
    let current = parseInt(moneyEl.textContent.split(" ")[1]) || 0;
    current += total;
    moneyEl.innerText = `💰 ${current}`;
    saveMoney(current);
  }

  alert(`🧺 Você vendeu suas colheitas por 💰 ${total}`);
  renderShop();
}
//loja menu
function renderShop() {
  const shopDiv = document.getElementById("seed-catalog");
  const moneyEl = document.getElementById("money");
  if (!shopDiv || !moneyEl) return;

  const currentMoney = parseInt(moneyEl.textContent.split(" ")[1]);
  shopDiv.innerHTML = '';

  seedCatalog.forEach(seed => {
    const canAfford = currentMoney >= seed.price;
    const sellValue = seed.price * 2;

    const div = document.createElement("div");
    div.className = 'seed';

    const button = document.createElement("button");
    button.innerText = "Comprar";
    button.onclick = () => buySeed(seed.id);
    button.disabled = !canAfford;

    const span = document.createElement("span");
    span.innerText = `${seed.emoji} ${seed.name} - 💰${seed.price}`;
    span.title = `💸 Valor de revenda: R$ ${sellValue}`;

    div.appendChild(span);
    div.appendChild(button);
    shopDiv.appendChild(div);
  });
}
//comprar semente
function buySeed(id) {
  const seed = seedCatalog.find(s => s.id === id);
  if (!seed) return;

  const moneyEl = document.getElementById("money");
  if (!moneyEl) return;

  let currentMoney = parseInt(moneyEl.textContent.split(" ")[1]);
  if (currentMoney < seed.price) {
    alert("💸 Dinheiro insuficiente!");
    return;
  }

  currentMoney -= seed.price;
  moneyEl.innerText = `💰 ${currentMoney}`;
  saveMoney(currentMoney);

  addToInventory(id);
  renderShop();
}

function saveMoney(value) {
  localStorage.setItem("dinheiro", value);
}
function loadMoney() {
  const saved = localStorage.getItem("dinheiro");
  if (saved) {
    const moneyEl = document.getElementById("money");
    if (moneyEl) moneyEl.innerText = `💰 ${parseInt(saved)}`;
  }
}

function saveInventory() {
  localStorage.setItem("inventario", JSON.stringify(inventory));
}
function loadInventory() {
  const data = localStorage.getItem("inventario");
  if (data) {
    inventory = JSON.parse(data);
    updateInventoryUI();
  }
}

function saveHarvestedItems() {
  localStorage.setItem("colheitas", JSON.stringify(harvestedItems));
}
function loadHarvestedItems() {
  const data = localStorage.getItem("colheitas");
  if (data) {
    harvestedItems = JSON.parse(data);
    updateHarvestHUD();
  }
}
//funções limitadoras visuais
function generateMountainData() {
  const spacing = 36;
  mountainData = [];
  for (let x = 0; x <= width; x += spacing) {
    const size = random(24, 40);
    mountainData.push({ x, size });
  }
}

function drawMountains() {
  for (let { x, size } of mountainData) {
    textSize(size);
    text('⛰️', x, height - size / 2);
  }
}

function generateForestData() {
  const spacing = 24;
  forestData = [];
  for (let x = -20; x <= width + 20; x += spacing) {
    if (x > width / 2 - 60 && x < width / 2 + 60) continue;
    const size = random(24, 56);
    const y = random(-20, 24);
    const emoji = random(['🌳', '🌲', '🌴']);
    forestData.push({ x, y, size, emoji });
  }
}

function drawTrees() {
  forestData.sort((a, b) => a.size - b.size);
  for (let tree of forestData) {
    textSize(tree.size);
    text(tree.emoji, tree.x, tree.y);
  }
}

function drawTreeLineOverlay() {
  noStroke();
  fill('#C9FBA6');
  rect(0, 0, width, 40);
}

function drawRivers() {
  noFill();
  stroke('#60c2f3');
  strokeWeight(60);
  beginShape();
  for (let y = 0; y <= height; y += 20) {
    let x = 0 + sin(y * 0.1) * 10;
    curveVertex(x, y);
  }
  endShape();
  beginShape();
  for (let y = 0; y <= height; y += 20) {
    let x = width + cos(y * 0.1) * 10;
    curveVertex(x, y);
  }
  endShape();
}
//casa e caminhão
function drawHouse() {
  textSize(64);
  text('🏡', width - 120, 100);
}

function drawTruck() {
  textSize(42);
  text('🚛', width / 2, 20);
}
//dica
function drawTruckHint() {
  if (nearTruck) {
    fill(0);
    textSize(16);
    text('Pressione R para abrir a loja', width / 2, 60);
  }
}
//player
function drawPlayer() {
  textSize(24);
  text('👨🏻‍🌾', player.x, player.y);
}
//movimento
function handleMovement() {
  let nextX = player.x;
  let nextY = player.y;
  if (keyIsDown(87)) nextY -= speed;
  if (keyIsDown(83)) nextY += speed;
  if (keyIsDown(65)) nextX -= speed;
  if (keyIsDown(68)) nextX += speed;
  if (nextX < 0 || nextX > width || nextY < 0 || nextY > height) return;
  if (!collides(nextX, nextY)) {
    player.x = nextX;
    player.y = nextY;
  }
}
//colisão
function collides(x, y) {
  for (let zone of collisionZones) {
    if (x > zone.x && x < zone.x + zone.w && y > zone.y && y < zone.y + zone.h) return true;
  }
  return false;
}
//zonas colidiveis
function setupCollisionZones() {
  collisionZones = [];
  const spacing = 36;
  for (let x = 0; x <= width; x += spacing) {
    if (x > width / 2 - 60 && x < width / 2 + 60) continue;
    collisionZones.push({ x: x, y: height - 40, w: spacing, h: 40 });
  }
  collisionZones.push({ x: 0, y: 0, w: 60, h: height });
  collisionZones.push({ x: width - 60, y: 0, w: 60, h: height });
  collisionZones.push({ x: width / 2 - 24, y: 0, w: 48, h: 40 });
  for (let tree of forestData) {
    collisionZones.push({
      x: tree.x - tree.size / 2,
      y: tree.y - tree.size / 2,
      w: tree.size,
      h: tree.size
    });
  }
}
//proximidade do caminhão
function checkTruckProximity() {
  const tx = width / 2;
  const ty = 20;
  nearTruck = dist(player.x, player.y, tx, ty) < 50;
}

function sellItems() {
  sellAllItems();
}
//fecha loja
function closeShopModal() {
  const shop = document.getElementById("shop");
  if (shop) shop.classList.add("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  const style = document.createElement("style");
  style.innerHTML = `canvas { position: absolute; top: 0; left: 0; z-index: 0; width: 100% !important; height: 100% !important; }`;
  document.head.appendChild(style);

  const btnPlay = document.getElementById("btnPlay");
  const startScreen = document.getElementById("startScreen");
  const hud = document.getElementById("hud");

  if (btnPlay) {
    btnPlay.addEventListener("click", () => {
      if (startScreen) startScreen.classList.add("hidden");
      if (hud) hud.classList.remove("hidden");

      const moneyEl = document.getElementById("money");
      if (moneyEl) {
        moneyEl.innerText = "💰 0";
        saveMoney(0);
      }

      const scoreEl = document.getElementById("score");
      if (scoreEl) scoreEl.innerText = "⭐ 0";

      loop();
      setupInventoryUI();

      const randomSeed = seedCatalog[Math.floor(Math.random() * seedCatalog.length)];
      addToInventory(randomSeed.id);
      starterSeedMessage = `Você ganhou 1x ${randomSeed.emoji} ${randomSeed.name}!`;
      starterSeedTime = millis();

      plantedSeeds.push({
        id: randomSeed.id,
        emoji: randomSeed.emoji,
        plantedAt: millis(),
        x: player.x,
        y: player.y
      });
    });
  }

  loadMoney();
  loadInventory();
  loadHarvestedItems();
  renderShop();

  const btnCloseShop = document.querySelector("#shop .close-shop");
  if (btnCloseShop) {
    btnCloseShop.addEventListener("click", () => {
      closeShopModal();
    });
  }
});
