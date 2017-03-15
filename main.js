const FRAME_SIZE = 150;
var friction = 0.0;
var acceleration = 10000;
var maxSpeed = 500;
var gameOver = false;
var statusMessage = "Pong!";

var entities = [];

var socket = io.connect("http://76.28.150.193:8888");

// BAR BOUNDS: Left X: 19, Right X: 31, Top Y: 20, Bottom Y: 130
//Keyboard
var Key = {
  _pressed : {},
UP: 38,
DOWN: 40,
S: 83,
L: 76,
  isDown: function(keyCode) {
     return this._pressed[keyCode];
   },

   onKeydown: function(event) {
     this._pressed[event.keyCode] = true;
   },

   onKeyup: function(event) {
     delete this._pressed[event.keyCode];
   }
 };

function Player(game) {
  this.spritesheet = ASSET_MANAGER.getAsset("./img/sprites.png");
  this.speed  = 100;
  this.cooldown = 10;
  this.velocity = {x: 100, y: 100};
  Entity.call(this, game, 25, 275);
}

Player.prototype = new Entity();
Player.prototype.constructor = Player;

Player.prototype.update = function () {
    if(!gameOver) {
        if(Key.isDown(Key.UP)){
            this.velocity.y += 50;
            this.y -= this.game.clockTick * (this.speed + this.velocity.y);
        } else if(Key.isDown(Key.DOWN)){
            this.velocity.y += 50;
            this.y += this.game.clockTick * (this.speed + this.velocity.y);
        } else {
            this.velocity.y = 100;
        }
        if (this.y < -150) {
            this.y = 700;
        } else if (this.y > 700){
            this.y = -150
        }
        if (this.cooldown === 0) {
            if (Key.isDown(Key.S)) {
                this.cooldown = 10;
                save();
            } else if (Key.isDown(Key.L)) {
                this.cooldown = 10;
                load();
            }
        } else {
            this.cooldown--;
        }
    }
    Entity.prototype.update.call(this);
}

Player.prototype.draw = function (ctx) {
    ctx.drawImage(this.spritesheet, 0, 0, 50, 150, this.x, this.y, 50, 150);
    Entity.prototype.draw.call(this);
}

function AI(game, ball) {
  this.spritesheet = ASSET_MANAGER.getAsset("./img/sprites.png");
  this.difficulty = 0.02;
  this.cooldown = 0;
  this.velocity = {x: 100, y: 100};
  this.ball = ball;
  Entity.call(this, game, 725, 275);
}

AI.prototype = new Entity();
AI.prototype.constructor = Player;

AI.prototype.update = function () {
    Entity.prototype.update.call(this);
    if (!gameOver) {
        if (this.cooldown > 0) {
            this.cooldown--;
        } else {
            this.y += (this.ball.y - this.y - 75) * this.difficulty + .01 * this.ball.velocity.y;
            if (this.y < -150) {
                this.y = 700;
            } else if (this.y > 700){
                this.y = -150
            }
        }
    }
}

AI.prototype.draw = function (ctx) {
    ctx.drawImage(this.spritesheet, 50, 0, 50, 150, this.x, this.y, 50, 150);
    Entity.prototype.draw.call(this);
}

function Circle(game) {
    this.radius = 20;
    this.spritesheet = ASSET_MANAGER.getAsset("./img/sprites.png");
    this.bounceDelay = 3;
    this.acceleration = 1.15;
    Entity.call(this, game, 390, 340);
    this.velocity = { x: 150, y: Math.random() * 10 };
    var speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
    if (speed > maxSpeed) {
        var ratio = maxSpeed / speed;
        this.velocity.x *= ratio * 2;
        this.velocity.y *= ratio * .5;
    };
}

Circle.prototype = new Entity();
Circle.prototype.constructor = Circle;

Circle.prototype.collideRight = function () {
    return this.x + this.radius > 800;
};
Circle.prototype.collideLeft = function () {
    return this.x - this.radius < 0;
};
Circle.prototype.collideBottom = function () {
    return this.y + this.radius > 700;
};
Circle.prototype.collideTop = function () {
    return this.y - this.radius < 0;
};

Circle.prototype.collide = function (bar) {
    if (this.y > (bar.y + 20) && this.y < (bar.y + 130)) {
        if (Math.abs(this.x - bar.x - 25) < this.radius + 6) {
            return true;
        }
    }
    return false;
};

Circle.prototype.update = function () {
    if(!gameOver) {
        Entity.prototype.update.call(this);

        this.x += this.velocity.x * this.game.clockTick;
        this.y += this.velocity.y * this.game.clockTick;

        if(this.bounceDelay > 0) {
            this.bounceDelay--;
        } else {
            if (this.collideRight()) {
                gameOver = true;
                statusMessage = "Player wins!";
            } else if (this.collideLeft()) {
                gameOver = true;
                statusMessage = "CPU Wins!";
            }
            if (this.collideTop() || this.collideBottom()) {
                this.bounceDelay = 3;
                this.velocity.y = -this.velocity.y;
            }

            for (var i = 0; i < this.game.entities.length; i++) {
                var ent = this.game.entities[i];
                if (this != ent && this.collide(ent)) {
                    this.bounceDelay = 3;
                    if (ent instanceof AI) {
                        ent.cooldown = 50;
                        ent.difficulty += (Math.random() * .01) - .004;
                    }
                    this.velocity.x = -1 * (this.velocity.x * (Math.random() + 0.7));
                    this.velocity.y += ent.velocity.y * .5;
                    var speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
                    if (speed > maxSpeed) {
                        var ratio = maxSpeed / speed;
                        this.velocity.x *= ratio;
                        this.velocity.y *= ratio;
                    };
                };
            };
        }
    }
}

Circle.prototype.draw = function (ctx) {
    ctx.drawImage(this.spritesheet, 100, 0, 50, 50, this.x - 25, this.y - 25, 50, 50);

    ctx.font="30px Verdana";
    ctx.fillStyle = "White";
    ctx.fillText(statusMessage, 350,50);
}

function distance(circle, bar) {
    var difX = circle.x - (bar.x + 25);
    var difY = circle.y - (bar.y);
    var dif = Math.sqrt(difX * difX + difY * difY);
    return dif;
};

function Background(game, spritesheet) {
    this.x = 0;
    this.y = 0;
    this.velocity = { x: 0, y: 0};
    this.spritesheet = spritesheet;
    this.game = game;
    this.ctx = game.ctx;
};

Background.prototype.draw = function () {
    this.ctx.drawImage(this.spritesheet,
                   this.x, this.y);
};

Background.prototype.update = function () {
};

function load() {
    console.log('loading');
    socket.emit('load', {studentname: 'tbs95', statename: '1.1'});
};

function save() {
    console.log('saving');
    socket.emit('save', {studentname: 'tbs95', statename: '1.1',
    gameOver: gameOver, statusMessage: statusMessage,
    ballBounceDelay: entities[0].bounceDelay,
    ballAcceleration: entities[0].acceleration,
    ballX: entities[0].x, ballX: entities[0].y,
    ballxVelocity: entities[0].velocity.x,
    ballyVelocity: entities[0].velocity.y,
    playerX: entities[1].x, playerY: entities[1].y,
    aiDifficulty: entities[2].difficulty,
    aiX: entities[2].x, aiY: entities[2].y,
    aiCooldown: entities[2].cooldown});
    gameOver: gameOver
};

// the "main" code begins here

var ASSET_MANAGER = new AssetManager();

ASSET_MANAGER.queueDownload("./img/sprites.png");
ASSET_MANAGER.queueDownload("./img/pong_background.png");

ASSET_MANAGER.downloadAll(function () {
    var canvas = document.getElementById('gameWorld');
    var ctx = canvas.getContext('2d');

    var gameEngine = new GameEngine();
    var player = new Player(gameEngine);
    var circle = new Circle(gameEngine);
    var ai = new AI(gameEngine, circle);

    gameEngine.init(ctx);
    gameEngine.start();
    var bg = new Background(gameEngine, ASSET_MANAGER.getAsset("./img/pong_background.png"));
    entities[0] = circle;
    entities[1] = player;
    entities[2] = ai;
    gameEngine.addEntity(bg);
    gameEngine.addEntity(player);
    gameEngine.addEntity(ai);
    gameEngine.addEntity(circle);

    socket.on("connect", function () {
        console.log("Socket connected.")
    });
    socket.on("disconnect", function () {
        console.log("Socket disconnected.")
    });
    socket.on("reconnect", function () {
        console.log("Socket reconnected.")
    });
    socket.on('save', function (data) {
    });
    socket.on('load', function (data) {
        gameOver = data.gameOver;
        statusMessage = data.statusMessage;
        entities[0].bounceDelay = data.ballBounceDelay;
        entities[0].acceleration = data.ballAcceleration;
        entities[0].x = data.ballX;
        entities[0].y = data.ballX;
        entities[0].velocity.x = data.ballxVelocity;
        entities[0].velocity.y = data.ballyVelocity;
        entities[1].x = data.playerX;
        entities[1].y = data.playerY;
        entities[2].difficulty = data.aiDifficulty;
        entities[2].cooldown = data.aiCooldown;
        entities[2].x = data.aiX;
        entities[2].y = data.aiY;
    });
});
