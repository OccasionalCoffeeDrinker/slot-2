$(function() {
    //definisanje varijabli
    var br = Math.floor((Math.random() * 99));
    var GAME = {
        canvas: {}, //canvas u  kome radimo
        gameWindow: {}, //prozor u kome se vrte slike
        symbol: {}, //vockice
        loadedFiles: [], //niz za punjenje fajlova
        numOfFilesToLoad: 3, //potreban broj fajlova
        spinning: false, //promenljiva koja vrti/ne vrti fajlove
        playBtn: null, //dugme za pokretanje igre
        exitBtn: null, //dugme koje nas vraca na pocetak igre
        finishPositions: [], //dobitne pozicije
        reelSheets: null, //memorijska vrednost ucitanog json fajla reel-sheets
        combinations: null, //memorijska vrednost ucitanog json fajla combinations
        credit: 0, //stanje kredita
        creditNode: null, //ispisivanje promenjenog kredita
        linesChoosen: 1, //broj izabranih linija za dobitak
        betChoosen: 10, //broj coinsa koje ulazemo
        sumBet: this.linesChoosen * this.betChoosen, //racuna koliki nam je pot
        sumBetNode: null, //ispisuje pot
        lineMarks: [], //niz koji se puni dobitnim kombinacijama
        lineMarkTimer: null, //trajanje prikazivanja dobitne linije
        controls: null, //memorijska vrednost ucitanog json fajla controls
        renderer: null, //rendere
        stage: null, //glavni stage
        background: null, //pozadinska slika
        slotStage: null, //stage na kome se vrte slike
        controlsStage: null, //stage na kome se nalaze kontrole igrice
        controlsSprite: null, //sprite na kome se nalaze
        columns: [], //niz u kome se nalaze kolone
        spinTimer: null, //promenljiva koja zadaje vreme trajanja spin funkcije

        load: function() {

            try {

                $.get('data/reel-sheets.json', {}, function(res) {
                    GAME.reelSheets = res.reel;
                    GAME.loadedFiles.push('reel-sheets.json');

                });
                $.get('data/combinations.json', {}, function(res) {
                    GAME.combinations = res;
                    GAME.loadedFiles.push('combinations.json');

                });

                $.get('data/controls.json', {}, function(res) {
                    GAME.controls = res;
                    GAME.loadedFiles.push('controls.json');
                    GAME.createGame()
                });


            } catch (error) {
                alert(error.message);
            }

        },
        createGame: function() {
            if (GAME.loadedFiles.length != GAME.numOfFilesToLoad) {
                return;
            }

            GAME.prompt();

            // DEFAULT VALUES
            GAME.canvas = GAME.controls.canvas;
            GAME.gameWindow = GAME.controls.gameWindow;
            GAME.symbol = GAME.controls.symbol;
            !GAME.credit ? GAME.credit = GAME.controls.credit : GAME.credit;

            GAME.renderer = new PIXI.autoDetectRenderer(GAME.canvas.width, GAME.canvas.height, { backgroundColor: 0xe3e3e3 });
            GAME.renderer.view.style.cssText = 'margin:auto;display:block;';
            document.body.appendChild(GAME.renderer.view);

            GAME.stage = new PIXI.Container();

            var bg = PIXI.Texture.fromImage(GAME.controls.images.green_bg);
            var background = new PIXI.Sprite(bg);
            background.position.set(100, 50);
            GAME.stage.addChild(background);

            GAME.slotStage = new PIXI.Container();
            GAME.controlsStage = new PIXI.Container();

            GAME.slotStage.width = GAME.gameWindow.width;
            GAME.slotStage.height = GAME.gameWindow.height;
            GAME.slotStage.position.x = 0;
            GAME.slotStage.position.y = 0;



            GAME.controlsStage.width = GAME.canvas.width;
            GAME.controlsStage.height = GAME.canvas.height;
            GAME.controlsStage.position.x = 0;
            GAME.controlsStage.position.y = 0;

            GAME.controlsSprite = new PIXI.Sprite(PIXI.Texture.fromImage(GAME.controls.images.controls_background));

            GAME.controlsSprite.position.set(0, 0);

            GAME.controlsSprite.width = GAME.canvas.width;
            GAME.controlsSprite.height = GAME.canvas.height;

            GAME.controlsStage.addChild(GAME.controlsSprite);


            GAME.stage.addChild(GAME.slotStage);
            GAME.stage.addChild(GAME.controlsStage);

            GAME.playBtn = new PIXI.Sprite(PIXI.Texture.fromImage(GAME.controls.images.play));
            GAME.playBtn.position.set(825, 550);
            GAME.playBtn.on("mouseover", function() {
                this._texture = PIXI.Texture.fromImage(GAME.controls.images.play_hover);
            });
            GAME.playBtn.on("mouseout", function() {
                this._texture = PIXI.Texture.fromImage(GAME.controls.images.play);
            });

            GAME.playBtn.on("click", GAME.spin);
            GAME.playBtn.interactive = true;
            GAME.controlsStage.addChild(GAME.playBtn);

            GAME.exitBtn = new PIXI.Sprite(PIXI.Texture.fromImage(GAME.controls.images.exit));
            GAME.exitBtn.position.set(25, 550);
            GAME.exitBtn.on("mouseover", function() {
                this._texture = PIXI.Texture.fromImage(GAME.controls.images.exit_hover);
            });
            GAME.exitBtn.on("mouseout", function() {
                this._texture = PIXI.Texture.fromImage(GAME.controls.images.exit);
            });

            GAME.exitBtn.on("click", function() {
                window.location.reload();
            });
            GAME.exitBtn.interactive = true;
            GAME.controlsStage.addChild(GAME.exitBtn);


            var lineBtnsContainer = new PIXI.Container();
            for (var i in GAME.controls.line_buttons) {
                GAME.controls.line_buttons[i].node = new PIXI.Sprite(PIXI.Texture.fromImage(GAME.linesChoosen == i ? GAME.controls.line_buttons[i].images.active : GAME.controls.line_buttons[i].images.no_active));
                GAME.controls.line_buttons[i].node.controlId = GAME.controls.line_buttons[i].id;
                GAME.controls.line_buttons[i].node.position.set(GAME.controls.line_buttons[i].position.x, GAME.controls.line_buttons[i].position.y);
                GAME.controls.line_buttons[i].node.on('click', GAME.changeLines);
                GAME.controls.line_buttons[i].node.interactive = true;
                lineBtnsContainer.addChild(GAME.controls.line_buttons[i].node);
            }
            GAME.controlsStage.addChild(lineBtnsContainer);

            var coinsBtnsContainer = new PIXI.Container();
            for (var i in GAME.controls.coins_buttons) {
                GAME.controls.coins_buttons[i].node = new PIXI.Sprite(PIXI.Texture.fromImage(GAME.betChoosen == GAME.controls.coins_buttons[i].id ? GAME.controls.coins_buttons[i].images.active : GAME.controls.coins_buttons[i].images.no_active));
                GAME.controls.coins_buttons[i].node.controlId = GAME.controls.coins_buttons[i].id;
                GAME.controls.coins_buttons[i].node.position.set(GAME.controls.coins_buttons[i].position.x, GAME.controls.coins_buttons[i].position.y);
                GAME.controls.coins_buttons[i].node.on('click', GAME.changeCoins);
                GAME.controls.coins_buttons[i].node.interactive = true;
                coinsBtnsContainer.addChild(GAME.controls.coins_buttons[i].node);
            }
            GAME.controlsStage.addChild(coinsBtnsContainer);

            var creditBox = new PIXI.Sprite(PIXI.Texture.fromImage(GAME.controls.images.credit_box));
            creditBox.position.set(150, 550);
            GAME.controlsStage.addChild(creditBox);


            var sumBet = new PIXI.Sprite(PIXI.Texture.fromImage(GAME.controls.images.empty_white_box));
            sumBet.position.set(650, 550);
            GAME.controlsStage.addChild(sumBet);


            GAME.addSymbols();
            GAME.viewSymbols();

            GAME.setCredit(GAME.credit);
            GAME.setSumBet(1, 5);


        },


        //funkcija za unos kredita
        prompt: function() {
            while (true) {
                GAME.credit = prompt('Enter your credit:', '10000');
                if (/^\d+$/.test(GAME.credit) === false) {
                    alert('Enter only numbers.');
                    continue;
                } else if (parseInt(GAME.credit) > parseInt(GAME.controls.max_credit)) {
                    alert('The maximum credit is ' + GAME.controls.max_credit);
                    continue;
                } else if (parseInt(GAME.credit) < parseInt(GAME.controls.min_credit)) {
                    alert('The minimum credit is ' + GAME.controls.min_credit);
                    continue;
                }
                break;
            }
        },
        addSymbols: function() {
            GAME.columns = {};
            for (var x = 0; x < 5; x++) {

                GAME.columns[x] = {};
                GAME.columns[x].container = new PIXI.Container();

                GAME.slotStage.addChild(GAME.columns[x].container);
                GAME.columns[x].container.position.x = GAME.symbol.width * x;

                GAME.columns[x].sprites = [];

                for (var j = 0; j < 297; j++) {

                    var sprite = new PIXI.Sprite(PIXI.Texture.fromImage(GAME.controls.symbols.images[GAME.reelSheets[x][j]]));

                    GAME.columns[x].sprites.push(sprite);

                    sprite.position.x = 100;
                    sprite.position.y = 50 + GAME.symbol.height * j;

                    sprite.width = GAME.symbol.width;
                    sprite.height = GAME.symbol.height;
                    GAME.columns[x].container.addChild(sprite);

                }

                for (var y = 0; y < 3; y++) {
                    var sprite = new PIXI.Sprite(PIXI.Texture.fromImage(GAME.controls.symbols.images[GAME.combinations[x][br][y]]));
                    GAME.columns[x].sprites.push(sprite);

                    sprite.position.x = 100;

                    sprite.position.y = 45050 + GAME.symbol.height * y;
                    sprite.width = GAME.symbol.width;
                    sprite.height = GAME.symbol.height;

                    GAME.columns[x].container.addChild(sprite);

                }



                GAME.columns[x].container.position.y = -GAME.columns[x].container.height + GAME.gameWindow.height;
                GAME.columns[x].spinning = false;

            }
        },


        viewSymbols: function() {
            GAME.columns[0].animate = function() {
                requestAnimationFrame(GAME.columns[0].animate);

                GAME.renderer.render(GAME.stage);

                if (GAME.columns[0].spinning === true) {
                    GAME.columns[0].container.position.y += GAME.controls.spinSpeed;
                }
            };
            GAME.columns[1].animate = function() {
                requestAnimationFrame(GAME.columns[1].animate);

                GAME.renderer.render(GAME.stage);
                if (GAME.columns[1].spinning === true) {
                    GAME.columns[1].container.position.y += GAME.controls.spinSpeed;
                }

            };
            GAME.columns[2].animate = function() {
                requestAnimationFrame(GAME.columns[2].animate);

                GAME.renderer.render(GAME.stage);
                if (GAME.columns[2].spinning === true) {
                    GAME.columns[2].container.position.y += GAME.controls.spinSpeed;
                }

            };
            GAME.columns[3].animate = function() {
                requestAnimationFrame(GAME.columns[3].animate);

                GAME.renderer.render(GAME.stage);
                if (GAME.columns[3].spinning === true) {
                    GAME.columns[3].container.position.y += GAME.controls.spinSpeed;
                }

            };
            GAME.columns[4].animate = function() {
                requestAnimationFrame(GAME.columns[4].animate);

                GAME.renderer.render(GAME.stage);

                if (GAME.columns[4].spinning === true) {
                    GAME.columns[4].container.position.y += GAME.controls.spinSpeed;
                }
            };

            GAME.columns[0].animate();
            GAME.columns[1].animate();
            GAME.columns[2].animate();
            GAME.columns[3].animate();
            GAME.columns[4].animate();
        },
        changeCoins: function() {
            if (GAME.spinning === true) { return; }
            GAME.controls.coins_buttons[GAME.betChoosen].node._texture = PIXI.Texture.fromImage(GAME.controls.coins_buttons[GAME.betChoosen].images.no_active);
            GAME.betChoosen = this.controlId;
            GAME.setSumBet();
            this._texture = PIXI.Texture.fromImage(GAME.controls.coins_buttons[this.controlId].images.active);
        },

        changeLines: function() {
            if (GAME.spinning === true) { return; }
            GAME.controls.line_buttons[GAME.linesChoosen].node._texture = PIXI.Texture.fromImage(GAME.controls.line_buttons[GAME.linesChoosen].images.no_active);
            GAME.linesChoosen = this.controlId;
            GAME.setSumBet();
            this._texture = PIXI.Texture.fromImage(GAME.controls.line_buttons[this.controlId].images.active);
        },
        isGameOver: function() {
            if (GAME.credit <= parseInt(GAME.controls.min_credit)) {
                confirm('You don\'t have enough money to continue. Do you want to play again.');
                window.location.reload();
            } else if (GAME.credit <= 0) {
                confirm('You lost all your money. Do you want to play again.');
                window.location.reload();
            }
        },
        hasEnoughMoney: function() {
            if (parseInt(GAME.credit) < parseInt(GAME.sumBet)) {
                return false;
            }
            return true;
        },
        setCredit: function(credit) {
            credit = parseInt(credit);

            if (!GAME.creditNode) {
                GAME.creditNode = new PIXI.Text(credit, { fontFamily: 'Hobo Std Medium', fontSize: '20px', fontWeight: 'bold', fill: 0xFF1111 });
                GAME.creditNode.position.set(165, 570);

                GAME.controlsStage.addChild(GAME.creditNode);
            } else {
                GAME.creditNode.position.set(165, 570);
                GAME.creditNode.text = GAME.credit = credit;
            }
        },
        setSumBet: function(lines, bet) {
            lines = (lines === undefined ? GAME.linesChoosen : lines);
            bet = (bet === undefined ? GAME.betChoosen : bet);

            GAME.sumBet = parseInt(lines) * parseInt(bet);

            if (!GAME.sumBetNode) {
                GAME.sumBetNode = new PIXI.Text(GAME.sumBet, { fontFamily: 'Hobo Std Medium', fontSize: '40px', fontWeight: 'bold', fill: 0xFF1111 });
                GAME.sumBetNode.position.set(675, 550);
                GAME.controlsStage.addChild(GAME.sumBetNode);
            } else {
                GAME.sumBetNode.position.set(675, 550);
                GAME.sumBetNode.text = GAME.sumBet;
            }
        },


        spin: function() {
            if (!GAME.hasEnoughMoney()) {
                alert("You do not have enough money. Try lower stakes.");
                return;
            }
            br = Math.floor((Math.random() * 99));
            GAME.slotStage.destroy(true);

            GAME.slotStage = new PIXI.Container();
            GAME.slotStage.width = 750;
            GAME.slotStage.height = 450;
            GAME.slotStage.position.x = 0;
            GAME.slotStage.position.y = 0;
            GAME.stage.addChild(GAME.slotStage);
            GAME.stage.addChild(GAME.controlsStage);
            GAME.addSymbols();
            GAME.viewSymbols();



            if (GAME.spinning === true) {
                GAME.clearSpinTimers();
                GAME.stopSpin(true);
                return;
            }
            GAME.toggleSpin(true);

            clearTimeout(GAME.lineMarkTimer);

            GAME.removeLineMarks();

            GAME.generateFinishPositions();

            GAME.columns[0].container.position.y = -GAME.columns[0].container.height + GAME.gameWindow.height;
            GAME.columns[1].container.position.y = -GAME.columns[1].container.height + GAME.gameWindow.height;
            GAME.columns[2].container.position.y = -GAME.columns[2].container.height + GAME.gameWindow.height;
            GAME.columns[3].container.position.y = -GAME.columns[3].container.height + GAME.gameWindow.height;
            GAME.columns[4].container.position.y = -GAME.columns[4].container.height + GAME.gameWindow.height;

            GAME.startTime();
        },
        startTime: function() {
            return GAME.spinTimer = setTimeout(GAME.stopSpin, 1000);
        },
        stopSpin: function(forceStop) {
            var stopColumnIn = 400;
            if (forceStop === true) {
                stopColumnIn = 1;
            }

            GAME.columns[0].spinTimer = setTimeout(function() {
                if (GAME.spinning === false) return;
                GAME.toggleSpin(false, 0);
                GAME.columns[0].container.position.y = -(300 * GAME.symbol.height);
            }, 0 * stopColumnIn);
            GAME.columns[1].spinTimer = setTimeout(function() {
                if (GAME.spinning === false) return;
                GAME.toggleSpin(false, 1);
                GAME.columns[1].container.position.y = -(300 * GAME.symbol.height);
            }, 1 * stopColumnIn);
            GAME.columns[2].spinTimer = setTimeout(function() {
                if (GAME.spinning === false) return;
                GAME.toggleSpin(false, 2);
                GAME.columns[2].container.position.y = -(300 * GAME.symbol.height);
            }, 2 * stopColumnIn);
            GAME.columns[3].spinTimer = setTimeout(function() {
                if (GAME.spinning === false) return;
                GAME.toggleSpin(false, 3);
                GAME.columns[3].container.position.y = -(300 * GAME.symbol.height);
            }, 3 * stopColumnIn);
            GAME.columns[4].spinTimer = setTimeout(function() {
                if (GAME.spinning === false) return;
                GAME.toggleSpin(false, 4);
                GAME.columns[4].container.position.y = -(300 * GAME.symbol.height);
                GAME.spinning = false;
                GAME.checkSpin();
            }, 4 * stopColumnIn);
        },
        toggleSpin: function(spinToggle, column) {
            if (column === undefined) {
                for (var i in GAME.columns) {
                    GAME.columns[i].spinning = spinToggle;
                }
                GAME.spinning = spinToggle;
            } else {
                GAME.columns[column].spinning = spinToggle;
            }
        },
        clearSpinTimers: function() {
            clearTimeout(GAME.spinTimer);
            clearTimeout(GAME.columns[0].spinTimer);
            clearTimeout(GAME.columns[1].spinTimer);
            clearTimeout(GAME.columns[2].spinTimer);
            clearTimeout(GAME.columns[3].spinTimer);
            clearTimeout(GAME.columns[4].spinTimer);
        },
        checkSpin: function() {
            var spinResult = GAME.checkLine();

            if (spinResult.length) {
                var lastWin = 0;
                for (var winLine in spinResult) {
                    lastWin += parseInt(GAME.sumBet);
                    GAME.setCredit(parseInt(GAME.credit) + parseInt(GAME.sumBet));

                    GAME.winProcess(spinResult[winLine]);
                }

            } else {
                GAME.setCredit(parseInt(GAME.credit) - parseInt(GAME.sumBet));
                GAME.isGameOver();
            }

            GAME.renderer.render(GAME.stage);
        },
        winProcess: function(winLine) {
            var line;
            if (GAME.lineMarks.indexOf(winLine) == -1) {
                line = new PIXI.Sprite(PIXI.Texture.fromImage(GAME.controls.lines[winLine].image));
                line.position.set(75, 60);
                GAME.slotStage.addChild(line);

                GAME.lineMarks[winLine] = {};

                GAME.lineMarks[winLine] = {
                    id: winLine,
                    node: line
                };
            } else {
                GAME.lineMarks[winLine].node.visible = true;
            }

            GAME.lineMarkTimer = setTimeout(function() {
                GAME.removeLineMarks();
            }, 4000);
        },

        removeLineMarks: function() {
            for (var i in GAME.lineMarks) {
                GAME.lineMarks[i].node.visible = false;
            }
        },

        checkLine: function() {
            var lineMatched = [];

            // * * * * *
            // 
            //
            if (GAME.getSymbolIndex(0, 0) == GAME.getSymbolIndex(1, 0) &&
                GAME.getSymbolIndex(1, 0) == GAME.getSymbolIndex(2, 0) &&
                GAME.getSymbolIndex(2, 0) == GAME.getSymbolIndex(3, 0) &&
                GAME.getSymbolIndex(3, 0) == GAME.getSymbolIndex(4, 0) &&
                GAME.getSymbolIndex(4, 0) == GAME.getSymbolIndex(0, 0)) {
                return [1];
            }

            if (GAME.linesChoosen == 1) return lineMatched;

            //
            // * * * * *
            // 
            if (GAME.getSymbolIndex(0, 1) == GAME.getSymbolIndex(1, 1) &&
                GAME.getSymbolIndex(1, 1) == GAME.getSymbolIndex(2, 1) &&
                GAME.getSymbolIndex(2, 1) == GAME.getSymbolIndex(3, 1) &&
                GAME.getSymbolIndex(3, 1) == GAME.getSymbolIndex(4, 1) &&
                GAME.getSymbolIndex(4, 1) == GAME.getSymbolIndex(0, 1)) {
                lineMatched.push(2);
            }
            if (GAME.linesChoosen == 2) return lineMatched;

            // 
            // 
            // * * * * *
            if (GAME.getSymbolIndex(0, 2) == GAME.getSymbolIndex(1, 2) &&
                GAME.getSymbolIndex(1, 2) == GAME.getSymbolIndex(2, 2) &&
                GAME.getSymbolIndex(2, 2) == GAME.getSymbolIndex(3, 2) &&
                GAME.getSymbolIndex(3, 2) == GAME.getSymbolIndex(4, 2) &&
                GAME.getSymbolIndex(4, 2) == GAME.getSymbolIndex(0, 2)) {
                lineMatched.push(3);
            }
            if (GAME.linesChoosen == 3) return lineMatched;

            // *       *
            //   *   *
            //     *
            if (GAME.getSymbolIndex(0, 0) == GAME.getSymbolIndex(1, 1) &&
                GAME.getSymbolIndex(1, 1) == GAME.getSymbolIndex(2, 2) &&
                GAME.getSymbolIndex(2, 2) == GAME.getSymbolIndex(3, 1) &&
                GAME.getSymbolIndex(3, 1) == GAME.getSymbolIndex(4, 0) &&
                GAME.getSymbolIndex(4, 0) == GAME.getSymbolIndex(0, 0)) {
                lineMatched.push(4)
            }
            if (GAME.linesChoosen == 4) return lineMatched;

            //     *
            //   *   *
            // *       *
            if (GAME.getSymbolIndex(0, 2) == GAME.getSymbolIndex(1, 1) &&
                GAME.getSymbolIndex(1, 1) == GAME.getSymbolIndex(2, 0) &&
                GAME.getSymbolIndex(2, 0) == GAME.getSymbolIndex(3, 1) &&
                GAME.getSymbolIndex(3, 1) == GAME.getSymbolIndex(4, 2) &&
                GAME.getSymbolIndex(4, 2) == GAME.getSymbolIndex(0, 2)) {
                lineMatched.push(5)
            }
            if (GAME.linesChoosen == 5) return lineMatched;

            // *   *   *
            //   *   *
            //    
            if (GAME.getSymbolIndex(0, 0) == GAME.getSymbolIndex(1, 1) &&
                GAME.getSymbolIndex(1, 1) == GAME.getSymbolIndex(2, 0) &&
                GAME.getSymbolIndex(2, 0) == GAME.getSymbolIndex(3, 1) &&
                GAME.getSymbolIndex(3, 1) == GAME.getSymbolIndex(4, 0) &&
                GAME.getSymbolIndex(4, 0) == GAME.getSymbolIndex(0, 0)) {
                lineMatched.push(6)
            }
            if (GAME.linesChoosen == 6) return lineMatched;
            //    
            // *   *   *
            //   *   *
            if (GAME.getSymbolIndex(0, 1) == GAME.getSymbolIndex(1, 2) &&
                GAME.getSymbolIndex(1, 2) == GAME.getSymbolIndex(2, 1) &&
                GAME.getSymbolIndex(2, 1) == GAME.getSymbolIndex(3, 2) &&
                GAME.getSymbolIndex(3, 2) == GAME.getSymbolIndex(4, 1) &&
                GAME.getSymbolIndex(4, 1) == GAME.getSymbolIndex(0, 1)) {
                lineMatched.push(7)
            }
            if (GAME.linesChoosen == 7) return lineMatched;

            //   *   *
            // *   *   *
            //
            if (GAME.getSymbolIndex(0, 1) == GAME.getSymbolIndex(1, 0) &&
                GAME.getSymbolIndex(1, 0) == GAME.getSymbolIndex(2, 1) &&
                GAME.getSymbolIndex(2, 1) == GAME.getSymbolIndex(3, 0) &&
                GAME.getSymbolIndex(3, 0) == GAME.getSymbolIndex(4, 1) &&
                GAME.getSymbolIndex(4, 1) == GAME.getSymbolIndex(0, 1)) {
                lineMatched.push(8)
            }
            if (GAME.linesChoosen == 8) return lineMatched;
            //  
            //   *   *
            // *   *   *
            if (GAME.getSymbolIndex(0, 2) == GAME.getSymbolIndex(1, 1) &&
                GAME.getSymbolIndex(1, 1) == GAME.getSymbolIndex(2, 2) &&
                GAME.getSymbolIndex(2, 2) == GAME.getSymbolIndex(3, 1) &&
                GAME.getSymbolIndex(3, 1) == GAME.getSymbolIndex(4, 2) &&
                GAME.getSymbolIndex(4, 2) == GAME.getSymbolIndex(0, 2)) {
                lineMatched.push(9)
            }
            if (GAME.linesChoosen == 9) return lineMatched;
            //     * * *
            //   *   
            // *
            if (GAME.getSymbolIndex(0, 2) == GAME.getSymbolIndex(1, 1) &&
                GAME.getSymbolIndex(1, 1) == GAME.getSymbolIndex(2, 0) &&
                GAME.getSymbolIndex(2, 0) == GAME.getSymbolIndex(3, 0) &&
                GAME.getSymbolIndex(3, 0) == GAME.getSymbolIndex(4, 0) &&
                GAME.getSymbolIndex(4, 0) == GAME.getSymbolIndex(0, 2)) {
                lineMatched.push(10)
            }

            return lineMatched;
        },

        getSymbolIndex: function(position, index) {
            return GAME.combinations[position][GAME.finishPositions[position]][index];
        },
        generateFinishPositions: function() {

            GAME.finishPositions[0] = br;
            GAME.finishPositions[1] = br;
            GAME.finishPositions[2] = br;
            GAME.finishPositions[3] = br;
            GAME.finishPositions[4] = br;
        }

    };
    GAME.load();

});