// Static catalog of 69 Pokémon with sprite URLs, unique chess-related speech lines, and battle skills.
// Sprite URL uses official artwork from PokeAPI.

export const MYSTERY_BOX_PRICE = 150;
export const LEGENDARY_BOX_PRICE = 1000;
export const BERRY_PRICE = 5;

// Updated rates: Legendary is now a 5% jackpot!
export const MYSTERY_BOX_RATES = {
  rare: 0.70,
  epic: 0.25,
  legendary: 0.05
};

export const POKEMON_CATALOG = [
  // ── STARTER ──
  {
    id: 'togepi',
    name: 'Togepi',
    pokedexNumber: 175,
    rarity: 'starter',
    price: 0,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/175.png',
    speechStyle: 'cheerful',
    speeches: {
      idle: ['Toge-toge! Ready for a puzzle?', 'Let\'s do our best today!', 'Yay, chess is so much fun!', 'Which piece should we move first?'],
      thinking: ['Hmm, let\'s look carefully!', 'We can find the win together!', 'I believe in you!', 'Let\'s check all the lines!'],
      correct: ['Toge-toge-prriii! You did it! 🎉', 'Amazing move! You\'re so smart!', 'Yay! We solved it!', 'That was brilliant!'],
      incorrect: ['Oh no, it\'s okay! Let\'s try again!', 'We can do it, don\'t give up!', 'Toge... maybe look for a check?', 'Let\'s recalculate!'],
      hint: ['What if we look at the king\'s position?', 'Look at that active piece!', 'Is there a way to attack two things at once?']
    },
    skill: {
      id: 'coinBoost',
      name: 'Cheer',
      type: 'passive',
      description: '✨ Encourages you, earning +0 extra coins (Base 15). Evolve me to upgrade!',
      params: { bonus: 0 }
    },
    evolvesTo: 'togekiss'
  },

  // ── COMMONS ──
  {
    id: 'pikachu',
    name: 'Pikachu',
    pokedexNumber: 25,
    rarity: 'common',
    price: 60,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/025.png',
    speechStyle: 'energetic',
    speeches: {
      idle: ['Pika! Let\'s spark some chess ideas!', 'Ready to storm the board? ⚡', 'Let\'s find some shocking moves!', 'Pikachu is ready when you are!'],
      thinking: ['Calculate fast like lightning!', 'Pika-chuuuu... where\'s the tactic?', 'Look for the forcing move!', 'Can you spot a quick fork?'],
      correct: ['Pika-pi! Brilliant checkmate! ⚡', 'Shockingly good move!', 'Zap! You got it right! 🎉', 'Pikachu is super excited!'],
      incorrect: ['Pika... try another path!', 'Don\'t get zapped! Recalculate!', 'Check the legal moves again!', 'You can spark a better idea!'],
      hint: ['Focus on the piece with the electric vibe!', 'Look for an immediate attack on the King!', 'Can a knight jump in there?']
    },
    skill: {
      id: 'shield',
      name: 'Lightning Shield',
      type: 'passive',
      description: '⚡ 50% chance to block wrong-move coin penalties.',
      params: { chance: 0.50 }
    },
    evolvesTo: 'raichu'
  },
  {
    id: 'charmander',
    name: 'Charmander',
    pokedexNumber: 4,
    rarity: 'common',
    price: 60,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/004.png',
    speechStyle: 'fiery',
    speeches: {
      idle: ['Char! Let\'s heat up the board!', 'My tail is burning for some tactics!', 'Let\'s cook up a winning strategy!', 'Ready to burn through these puzzles?'],
      thinking: ['Feel the heat! Look for the fire move!', 'Let\'s melt their defense!', 'Calculate the forcing lines!', 'Don\'t let their defense cool you down!'],
      correct: ['Char! Burning hot checkmate! 🔥', 'You roasted their defense!', 'Flame on! Solved! 🎉', 'What a blazing move!'],
      incorrect: ['Char... tail flame went down a bit. Try again!', 'Not quite, but the fire is still lit!', 'Keep the heat on! Recalculate!', 'Try a warmer move!'],
      hint: ['Look for a sacrifice to open up the king!', 'Which piece is undefended? Attack it!', 'The rook diagonal looks hot!']
    },
    skill: {
      id: 'coinBoost',
      name: 'Ember Spark',
      type: 'passive',
      description: '🔥 Earn +1 extra coin on normal solves, and +3 on speed solves (under 10s).',
      params: { bonus: 1, speedBonus: 3 }
    },
    evolvesTo: 'charizard'
  },
  {
    id: 'bulbasaur',
    name: 'Bulbasaur',
    pokedexNumber: 1,
    rarity: 'common',
    price: 60,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/001.png',
    speechStyle: 'calm',
    speeches: {
      idle: ['Bulba! Let\'s grow our chess knowledge.', 'A steady mind wins the game.', 'Ready to root out their weaknesses?', 'Let\'s take it one square at a time.'],
      thinking: ['Patience. Let the position mature.', 'Look for the quiet, positional move.', 'How can we improve our pieces?', 'Think before you leap.'],
      correct: ['Bulba-saur! Excellent growth! 🌿', 'Positional mastery!', 'You rooted out the checkmate! 🎉', 'Perfect execution.'],
      incorrect: ['Bulba... let\'s plant a different seed.', 'Take a breath and look at the board again.', 'Patience. Try another line.', 'Check your defenses.'],
      hint: ['Look for a quiet move that pins a piece.', 'Is there a way to trap their queen?', 'Consider the power of your bishop.']
    },
    skill: {
      id: 'coinBoost',
      name: 'Growth',
      type: 'passive',
      description: '🌿 Earn +3 extra coins on every solved puzzle.',
      params: { bonus: 3 }
    },
    evolvesTo: 'venusaur'
  },
  {
    id: 'squirtle',
    name: 'Squirtle',
    pokedexNumber: 7,
    rarity: 'common',
    price: 60,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/007.png',
    speechStyle: 'confident',
    speeches: {
      idle: ['Squirtle Squad, roll out! Let\'s win!', 'Water you waiting for? Let\'s play!', 'Too cool for blunder!', 'Ready to wash away their defenses?'],
      thinking: ['Let\'s make a splash with a tactic!', 'Keep your eyes on the board, shades on!', 'Navigate the lines smoothly.', 'Can we flood their back rank?'],
      correct: ['Squirtle! Smooth sailing! 🌊', 'You washed them out!', 'Flawless victory! 🎉', 'Stylin\' and profilin\' checkmate!'],
      incorrect: ['Squirtle... a bit washed. Try again!', 'Shell up and recalculate!', 'No sweat, try another move.', 'Keep cool, we got this.'],
      hint: ['Is the back rank weak? Look for a rook slide!', 'Pin that knight to the king!', 'A pawn push might wash them out.']
    },
    skill: {
      id: 'shield',
      name: 'Water Shell',
      type: 'passive',
      description: '🌊 40% chance to shield wrong-move coin penalties.',
      params: { chance: 0.40 }
    },
    evolvesTo: 'blastoise'
  },
  {
    id: 'eevee',
    name: 'Eevee',
    pokedexNumber: 133,
    rarity: 'common',
    price: 60,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/133.png',
    speechStyle: 'curious',
    speeches: {
      idle: ['Eev-vee! So many possibilities!', 'How should we adapt to this board?', 'Let\'s explore every option!', 'I wonder what the best move is?'],
      thinking: ['Let\'s look at all the candidate moves!', 'What if we try this? Or that?', 'Let\'s evolve our strategy!', 'Look at all the diagonals.'],
      correct: ['Vee! The perfect move! 🎉', 'You evolved the position!', 'Super clever solution!', 'I knew we\'d find it!'],
      incorrect: ['Eev... let\'s adapt and try another way.', 'Don\'t worry, there\'s another option!', 'Let\'s search for a better square.', 'Try another candidate move!'],
      hint: ['Look at the piece that has the most choices!', 'What if we move the bishop along that open line?', 'Is there a threat we can deflect?']
    },
    skill: {
      id: 'voltSwitch',
      name: 'Adaptability',
      type: 'active',
      description: '🪞 Refresh another teammate\'s active skill cooldown (1 use/round).',
      params: {}
    }
  },
  {
    id: 'jigglypuff',
    name: 'Jigglypuff',
    pokedexNumber: 39,
    rarity: 'common',
    price: 60,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/039.png',
    speechStyle: 'sweet',
    speeches: {
      idle: ['Jiggly! Let\'s sing a song of victory!', 'Don\'t fall asleep on this puzzle! 🎤', 'Ready to charm our opponent?', 'Let\'s make beautiful chess music together!'],
      thinking: ['Hummm... let\'s find the rhythm.', 'Are they sleeping on defense?', 'Look for a sweet tactical melody.', 'Which piece sings to you?'],
      correct: ['Puff! A masterpiece of a move! 🎶', 'You put their defense to sleep!', 'Yay! Beautifully solved! 🎉', 'Such a sweet finish!'],
      incorrect: ['Jiggly... did we hit a sour note?', 'Don\'t pout! Try another melody.', 'Let\'s sing a different tune.', 'Wake up! Recalculate!'],
      hint: ['Look for a way to decoy their defender away!', 'The queen can create a lovely double attack.', 'Can we sing a check to the king?']
    },
    skill: {
      id: 'sleep',
      name: 'Sing Lullaby',
      type: 'active',
      description: '🎤 Sing a lullaby! Puts all of a classmate\'s companion Pokémon to sleep for 15 seconds (60s cooldown).',
      params: { duration: 40 }
    }
  },
  {
    id: 'psyduck',
    name: 'Psyduck',
    pokedexNumber: 54,
    rarity: 'common',
    price: 60,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/054.png',
    speechStyle: 'confused',
    speeches: {
      idle: ['Psy... duck? My head hurts.', 'Chess is... confusing...', 'What are we doing again?', 'Psyduck is trying... hard...'],
      thinking: ['Uh oh... candidate moves? Headache...', 'Where is the king? Oh, there.', 'Maybe... this piece? Or that one?', 'Psy... calculating... slowly...'],
      correct: ['PSYDUCK! Wow, a psychic move! 🧠', 'Wait, we won? Incredible! 🎉', 'Headache cleared! Genius move!', 'Psy-psy! We did it!'],
      incorrect: ['Psy... wrong? My head is spinning!', 'Ouch! Let\'s try a different one.', 'Wait, did I trip over a pawn?', 'Let\'s rethink... if we can...'],
      hint: ['I think... maybe... that shiny piece? No, wait.', 'Look at the knight... it jumps weirdly.', 'Attack the defender! I think...']
    },
    skill: {
      id: 'smokescreen',
      name: 'Confusion',
      type: 'active',
      description: '🌀 Swap your current puzzle with a random new one (1 use/round).',
      params: {}
    }
  },
  {
    id: 'snorlax',
    name: 'Snorlax',
    pokedexNumber: 143,
    rarity: 'common',
    price: 60,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/143.png',
    speechStyle: 'sleepy',
    speeches: {
      idle: ['*yawn*... is it our turn?', 'Let\'s solve this before naptime...', 'Snorlax is... resting...', 'Ready to block their path?'],
      thinking: ['Thinking is... exhausting... zzz...', 'Look for a solid, heavy block.', 'Can we just squash their defense?', 'Let\'s find a quiet square.'],
      correct: ['*yawn*... naptime checkmate! 💤', 'You crushed it! Awesome.', 'Solid solution! 🎉', 'Now I can sleep in peace...'],
      incorrect: ['Zzz... huh? Wrong move?', 'Let\'s stretch and try again.', 'Too fast... slow down and think.', 'Mmm... retry.'],
      hint: ['Look for a block. Use a heavy piece!', 'Can we push a pawn to block their escape?', 'Is their king trapped in his own bed?']
    },
    skill: {
      id: 'extraSkips',
      name: 'Rest',
      type: 'passive',
      description: '💤 Grants +1 extra skip at the start of the round.',
      params: { amount: 1 }
    }
  },
  {
    id: 'piplup',
    name: 'Piplup',
    pokedexNumber: 393,
    rarity: 'common',
    price: 60,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/393.png',
    speechStyle: 'proud',
    speeches: {
      idle: ['Pip! I\'m the proudest penguin here!', 'Let\'s show them our perfect strategy!', 'Victory is the only option!', 'No blunders for Piplup!'],
      thinking: ['Stand tall! Look for the most elegant move.', 'We must break their guard with style.', 'Verify all variations!', 'A proud player always calculates.'],
      correct: ['Pip-pip! Majestic checkmate! 👑', 'Flawless, as expected!', 'You showed true class! 🎉', 'A brilliant victory!'],
      incorrect: ['Pip?! Impossible! It must be a trick.', 'Dust yourself off. Try again immediately!', 'We will not be defeated! Recalculate!', 'Aim higher! Try another move.'],
      hint: ['Look for a way to show off your queen\'s power!', 'Attack their highest value piece!', 'Pin them down and stand proud!']
    },
    skill: {
      id: 'streakMaster',
      name: 'Pride',
      type: 'passive',
      description: '👑 Increases your streak coin bonuses by 1.2x.',
      params: { multiplier: 1.2 }
    }
  },
  {
    id: 'mudkip',
    name: 'Mudkip',
    pokedexNumber: 258,
    rarity: 'common',
    price: 60,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/258.png',
    speechStyle: 'friendly',
    speeches: {
      idle: ['So I herd u like mudkipz and chess?', 'Let\'s play a fun game!', 'Ready to find some cool puzzles?', 'Let\'s work together as friends!'],
      thinking: ['Hmm, let\'s splash around some candidate moves!', 'What do you think of this line?', 'Let\'s check all our pieces.', 'How can we help each other?'],
      correct: ['Kip! Splendid checkmate! 🌊', 'We did it together! 🎉', 'Awesome job, friend!', 'That move was super cool!'],
      incorrect: ['Kip-kip... not quite, but let\'s try again!', 'No worries, we can figure it out!', 'Let\'s search for another idea.', 'Try again, buddy!'],
      hint: ['Look for a friendly piece that can assist!', 'Can we double team their weak pawn?', 'Check the open file for our rook!']
    },
    skill: {
      id: 'underdog',
      name: 'Friendship',
      type: 'passive',
      description: '🤝 If you are in the bottom 3 on the leaderboard, earn +4 coins per solve.',
      params: { bonus: 4 }
    }
  },
  {
    id: 'torchic',
    name: 'Torchic',
    pokedexNumber: 255,
    rarity: 'common',
    price: 60,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/255.png',
    speechStyle: 'peppy',
    speeches: {
      idle: ['Tor-chic! Let\'s go, let\'s go!', 'Ready to spark up a win?', 'I\'m so excited to solve this!', 'Let\'s run through this queue!'],
      thinking: ['Quick, quick! Where is the tactical spark?', 'Let\'s hop to the best square!', 'Look for checks and captures!', 'Can we break through right now?'],
      correct: ['Chic! Firecracker checkmate! 💥', 'So fast, so accurate! 🎉', 'Yay! Solved it in a flash!', 'Super pep-pep move!'],
      incorrect: ['Tor... a little misstep! Try again!', 'Bounce back! We got this!', 'Don\'t lose your energy! Recalculate!', 'Try a peppier move!'],
      hint: ['Look for an active knight jump!', 'Can you attack their king immediately?', 'Look for a quick capture!']
    },
    skill: {
      id: 'frenzy',
      name: 'Peppy Rage',
      type: 'active',
      description: '🔥 Double coin gains and double coin penalties for the next 30s (1 use/round).',
      params: { duration: 30 }
    }
  },
  {
    id: 'chikorita',
    name: 'Chikorita',
    pokedexNumber: 152,
    rarity: 'common',
    price: 60,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/152.png',
    speechStyle: 'gentle',
    speeches: {
      idle: ['Chiko! Let\'s enjoy a nice chess session.', 'A gentle approach often works best.', 'Ready to bloom on the board?', 'Let\'s play a peaceful, smart game.'],
      thinking: ['Look for the harmonious move.', 'How can we support our pieces gently?', 'Consider the safety of your king.', 'Let the ideas blossom naturally.'],
      correct: ['Chiko-rita! A beautiful win! 🌸', 'Harmonious checkmate!', 'Lovely execution! 🎉', 'So elegant.'],
      incorrect: ['Chiko... let\'s take a step back and look.', 'No rush, try another gentle path.', 'Let\'s refresh our thoughts.', 'Recalculate with care.'],
      hint: ['Look for a quiet bishop move to support.', 'Can we block their threat peacefully?', 'Keep your pieces close and guarded.']
    },
    skill: {
      id: 'cleanse',
      name: 'Aromatherapy',
      type: 'active',
      description: '🧪 Instantly cleanse yourself of any active freezes or smokescreens (1 use/round).',
      params: {}
    }
  },
  {
    id: 'cyndaquil',
    name: 'Cyndaquil',
    pokedexNumber: 155,
    rarity: 'common',
    price: 60,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/155.png',
    speechStyle: 'timid',
    speeches: {
      idle: ['Cynda... I hope we don\'t blunder.', 'Is it safe to play?', 'Let\'s try to find a safe move...', 'Ready... I think?'],
      thinking: ['Let\'s look carefully... don\'t get checked!', 'What is their hidden threat?', 'Is this square safe for us?', 'I\'ll flare my back if we find it!'],
      correct: ['Cynda! We found it! High flare! 🔥', 'Safe and victorious! 🎉', 'Wow, that was a brave move!', 'We did it!'],
      incorrect: ['Cynda... I got scared. Let\'s try again.', 'Is there a safer square?', 'Let\'s recheck the threats.', 'Don\'t worry, try another way.'],
      hint: ['Look for a defensive piece that can turn into an attacker!', 'Which square is completely safe from their bishop?', 'Look for a back-rank protector.']
    },
    skill: {
      id: 'shield',
      name: 'Timid Guard',
      type: 'passive',
      description: '🛡️ 30% chance to shield wrong-move coin loss.',
      params: { chance: 0.30 }
    },
    evolvesTo: 'charizard'
  },
  {
    id: 'totodile',
    name: 'Totodile',
    pokedexNumber: 158,
    rarity: 'common',
    price: 60,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/158.png',
    speechStyle: 'playful',
    speeches: {
      idle: ['Toto-toto! Let\'s bite their pieces! 🐊', 'Ready to dance on the board?', 'Let\'s make a splash!', 'Woohoo! Puzzle time!'],
      thinking: ['Snap, snap! Where\'s the juicy capture?', 'Let\'s dance our way to the king!', 'Can we bite their rook?', 'Look for a wild tactic!'],
      correct: ['Toto! Chomp checkmate! 🎉', 'Happy jaw-dance time! 🐊', 'You snapped up the win!', 'That was super fun!'],
      incorrect: ['Toto... missed the bite. Try again!', 'Shake it off and dance again!', 'Chomp a different square!', 'Let\'s play another move!'],
      hint: ['Which piece can we chomp right now?', 'Look for a check that forces their king to move!', 'Can the rook bite down the file?']
    },
    skill: {
      id: 'coinBoost',
      name: 'Chomp Bite',
      type: 'passive',
      description: '🐊 Earn +2 extra coins per solved puzzle.',
      params: { bonus: 2 }
    },
    evolvesTo: 'blastoise'
  },
  {
    id: 'meowth',
    name: 'Meowth',
    pokedexNumber: 52,
    rarity: 'common',
    price: 60,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/052.png',
    speechStyle: 'mischievous',
    speeches: {
      idle: ['Meow! Ready to make some easy money?', 'Let\'s swipe some points!', 'Spotted a weak link!', 'Show me the coins!'],
      thinking: ['Sneaking around...', 'Is there an unprotected coin nearby?', 'Calculate their mistakes.', 'Look for a direct theft.'],
      correct: ['Purr... solved with style! 🪙', 'Easy money! 🎉', 'Stole the show!', 'Smooth swipe.'],
      incorrect: ['Meow?! Caught red-handed. Try again!', 'A little slip, recalculate!', 'Not that path, try another.', 'Let\'s retry.'],
      hint: ['Which of their pieces is completely undefended?', 'A simple capture will solve this!', 'Look for a double attack.']
    },
    skill: {
      id: 'coinSteal',
      name: 'Pay Day',
      type: 'active',
      description: '💰 Steal 70 coins from a classmate of your choice (1 use/round).',
      params: { amount: 70 }
    },
    evolvesTo: 'persian'
  },
  {
    id: 'geodude',
    name: 'Geodude',
    pokedexNumber: 74,
    rarity: 'common',
    price: 60,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/074.png',
    speechStyle: 'tough',
    speeches: {
      idle: ['Rock solid! Let\'s go!', 'Ready to crush them?', 'No Blunders, only blocks!', 'A tough game is a winning game.'],
      thinking: ['Solid block... where is it?', 'Hold the defense!', 'Pawn shield ready.', 'Calculate carefully.'],
      correct: ['Rock slide checkmate! 🪨', 'Crushed it! 🎉', 'Solid execution!', 'Perfect defense.'],
      incorrect: ['Slipped on gravel. Try again!', 'Re-fortify your structure!', 'Keep tough, retry.', 'Check your armor.'],
      hint: ['Use a pawn to block their attacker!', 'Is there a way to reinforce your defense?', 'Look for a solid check.']
    },
    skill: {
      id: 'shield',
      name: 'Rock Polish',
      type: 'passive',
      description: '🪨 30% chance to shield wrong-move coin penalties.',
      params: { chance: 0.30 }
    },
    evolvesTo: 'golem'
  },
  {
    id: 'gastly',
    name: 'Gastly',
    pokedexNumber: 92,
    rarity: 'common',
    price: 60,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/092.png',
    speechStyle: 'spooky',
    speeches: {
      idle: ['Keke... spooky board!', 'Ready for a scare?', 'Look in the shadows...', 'Chess from the grave!'],
      thinking: ['Float through their defenses...', 'Devious trick... where?', 'Sneaky double check...', 'Calculate the spook.'],
      correct: ['Spooked checkmate! 👻', 'Trick succeeded! 🎉', 'Spooky victory!', 'Caught in the shadow.'],
      incorrect: ['Faded out. Try again.', 'Ghostly error, recalculate.', 'Not that line, retry.', 'Stay spooky.'],
      hint: ['Is there a double check hiding in the dark?', 'Attack their king from behind!', 'Look for a rook lift.']
    },
    skill: {
      id: 'smokescreen',
      name: 'Spook',
      type: 'active',
      description: '🌫️ Hide a classmate\'s board coordinate letters/numbers for 15 seconds (60s cooldown).',
      params: { duration: 30 }
    },
    evolvesTo: 'gengar'
  },
  {
    id: 'machop',
    name: 'Machop',
    pokedexNumber: 66,
    rarity: 'common',
    price: 60,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/066.png',
    speechStyle: 'determined',
    speeches: {
      idle: ['Chop chop! Let\'s work out!', 'Ready to power through?', 'Pushing pawns, building muscle!', 'Let\'s break their lines!'],
      thinking: ['Push through! Active moves only!', 'Where is the heavy hit?', 'Calculate the force.', 'Attack f7!'],
      correct: ['Karate chop checkmate! 🥊', 'Pure power! 🎉', 'Broke their guard!', 'Strong win.'],
      incorrect: ['Missed the punch! Try again.', 'Flex your brain, recalculate.', 'Stay determined, retry.', 'Try again with force.'],
      hint: ['Look for a direct piece capture to break through!', 'Can we push a pawn to open their king?', 'Look for a check.']
    },
    skill: {
      id: 'coinBoost',
      name: 'Karate Chop',
      type: 'passive',
      description: '🥊 Earn +1 coin on normal solves, and +4 on speed solves (under 10s).',
      params: { bonus: 1, speedBonus: 4 }
    },
    evolvesTo: 'machamp'
  },
  {
    id: 'slakoth',
    name: 'Slakoth',
    pokedexNumber: 287,
    rarity: 'common',
    price: 60,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/287.png',
    speechStyle: 'lazy',
    speeches: {
      idle: ['Yawn... so slow...', 'Can we skip this one?', 'Resting is good.', 'Chess is tiring.'],
      thinking: ['Calculate... slowly... zzz...', 'Take... your... time...', 'Any... safe... move...', 'Lazy thinking...'],
      correct: ['Naptime win! 💤', 'Finally solved. 🎉', 'Okay, sleep time.', 'Nice and easy.'],
      incorrect: ['Uh... wrong? Back to sleep.', 'Slow down and retry.', 'No rush, recalculate.', 'Sleepy retry.'],
      hint: ['Look for a way to swap or skip this puzzle!', 'Is there a simple checkmate?', 'Take the easiest capture.']
    },
    skill: {
      id: 'extraSkips',
      name: 'Slack Off',
      type: 'passive',
      description: '🦥 Grants +1 extra skip at the start of the round.',
      params: { amount: 1 }
    }
  },
  {
    id: 'growlithe',
    name: 'Growlithe',
    pokedexNumber: 58,
    rarity: 'common',
    price: 60,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/058.png',
    speechStyle: 'loyal',
    speeches: {
      idle: ['Bark! Loyal companion here!', 'Ready to defend the board?', 'Let\'s help a friend!', 'Growl! Let\'s win!'],
      thinking: ['Guard the king! Look for defensive threats.', 'Find the active coordinate.', 'Coordinate our pieces.', 'Loyal search...'],
      correct: ['Flame charge checkmate! 🔥', 'Loyal victory! 🎉', 'We did it together!', 'Perfect execution.'],
      incorrect: ['Bark! A misstep, try again!', 'Protect the pieces, recalculate.', 'Stay loyal, retry.', 'Check your king\'s safety.'],
      hint: ['Look for a way to defend your queen from their attack!', 'Can we block their bishop with our knight?', 'Check f7!']
    },
    skill: {
      id: 'growlitheActive',
      name: 'Friendly Bark',
      type: 'active',
      description: '🐶 Send 5 coins to a classmate, and you both get a +10 coin bonus from the bank! (1 use/round)',
      params: { cost: 5, bonus: 10 }
    }
  },
  {
    id: 'magikarp',
    name: 'Magikarp',
    pokedexNumber: 129,
    rarity: 'common',
    price: 60,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/129.png',
    speechStyle: 'flopping',
    speeches: {
      idle: ['Karp karp... splash...', 'I\'m trying my best!', 'Will I evolve soon?', 'Chess is hard for a fish.'],
      thinking: ['Flop flop... candidate moves?', 'Just splash around...', 'Hoping for a miracle...', 'Calculations are blurry...'],
      correct: ['Wow! Splashed to victory! 💦', 'A miracle solved! 🎉', 'Karp! I did it!', 'Evolving thoughts!'],
      incorrect: ['Karp... flopped. Try again.', 'Don\'t give up, splash again!', 'Recalculate the flop.', 'Retry, karp!'],
      hint: ['Look for a move that seems completely useless but works!', 'Check their back rank!', 'Can we push our pawn?']
    },
    skill: {
      id: 'underdog',
      name: 'Splash',
      type: 'passive',
      description: '🐟 If you are in the bottom 3 on the leaderboard, get +6 coins per solve.',
      params: { bonus: 6 }
    },
    evolvesTo: 'gyarados'
  },
  {
    id: 'aron',
    name: 'Aron',
    pokedexNumber: 304,
    rarity: 'common',
    price: 60,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/304.png',
    speechStyle: 'metallic',
    speeches: {
      idle: ['Clank! Iron armor ready!', 'Let\'s build an iron defense!', 'Ready to eat some steel puzzles?', 'Unbreakable Aron!'],
      thinking: ['Armor up! Check their threats.', 'Find the steel block.', 'Solid pawn wall...', 'Calculate the guard.'],
      correct: ['Iron head checkmate! 🛡️', 'Unbreakable victory! 🎉', 'Perfect steel guard!', 'Clean win.'],
      incorrect: ['Clank! Armor dented, try again.', 'Re-fortify the walls, recalculate.', 'Stay sturdy, retry.', 'Check your flank.'],
      hint: ['Look for a way to lock the center of the board with a pawn!', 'Can we shield our rook from attack?', 'Look for a solid check.']
    },
    skill: {
      id: 'aronSturdy',
      name: 'Sturdy Shield',
      type: 'passive',
      description: '🛡️ The very first wrong move of the round is guaranteed to be 100% shielded.',
      params: {}
    },
    evolvesTo: 'aggron'
  },
  {
    id: 'pichu',
    name: 'Pichu',
    pokedexNumber: 172,
    rarity: 'common',
    price: 60,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/172.png',
    speechStyle: 'cute energy',
    speeches: {
      idle: ['Pi-pichu! So tiny but ready!', 'Let\'s play some chess sparks!', 'I\'ll do my best!', 'Yay, chess time!'],
      thinking: ['Sparks... where?', 'Tiny brain, big calculations!', 'Look closely...', 'Can we find it?'],
      correct: ['Pichu! Spark checkmate! ⚡', 'Yay, we solved it! 🎉', 'So happy! 🎉', 'Pichu did it!'],
      incorrect: ['Pi... got shocked! Try again.', 'It\'s okay, pichu will try again!', 'Recalculate the sparks.', 'Retry!'],
      hint: ['Look for an active check on their king!', 'Can a knight jump in?', 'Is f7 weak?']
    },
    skill: {
      id: 'freeHint',
      name: 'Sweet Charm',
      type: 'active',
      description: '🔮 Allows your next hint to be free (bypassing the coin cost, 1 use/round).',
      params: {}
    },
    evolvesTo: 'pikachu'
  },
  {
    id: 'abra',
    name: 'Abra',
    pokedexNumber: 63,
    rarity: 'common',
    price: 60,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/063.png',
    speechStyle: 'telepathic',
    speeches: {
      idle: ['Abra... sleeping but calculating...', 'I sense a win in my dreams...', 'Ready to teleport away from danger?', 'Focusing... zzz...'],
      thinking: ['Telepathic search...', 'Calculating in my sleep...', 'Warp lines...', 'Focus...'],
      correct: ['Teleport checkmate! 🌀', 'Perfect dream solved! 🎉', 'Spooky calculation!', 'Warped win.'],
      incorrect: ['Woke up. Try again.', 'Temporal error, recalculate.', 'Not that dream, retry.', 'Sleep again.'],
      hint: ['Can we warp a piece to their back rank?', 'Look for a long diagonal bishop slide.', 'Check f7!']
    },
    skill: {
      id: 'abraTeleport',
      name: 'Teleport Skip',
      type: 'active',
      description: '🌀 Instantly skip your current puzzle for free, without using up your skip token (1 use/round).',
      params: {}
    },
    evolvesTo: 'alakazam'
  },

  // ── RARES ──
  {
    id: 'gengar',
    name: 'Gengar',
    pokedexNumber: 94,
    rarity: 'rare',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/094.png',
    speechStyle: 'mischievous',
    speeches: {
      idle: ['Hehehe... ready to play some tricks?', 'Let\'s spook our opponent! 👻', 'I see a sneaky move in the shadows...', 'Are you ready for a scare?'],
      thinking: ['Sneak behind their lines...', 'Look for the hidden threat they missed!', 'Can we play a devious fork?', 'Time for a shadow attack...'],
      correct: ['Hehehe! Spooky checkmate! 👻', 'You completely tricked them!', 'Out of the shadows and won! 🎉', 'Devious execution!'],
      incorrect: ['Geng... they saw through the trick.', 'Try another shadow path!', 'Let\'s play a sneakier move.', 'Re-calculate the mischief!'],
      hint: ['Look for a sneaky back-rank checkmate!', 'Is there a fork hiding in the shadows?', 'Can we deflect their defender?']
    },
    skill: {
      id: 'gengarCurse',
      name: 'Shadow Curse',
      type: 'active',
      description: '👻 Cast Smokescreen on a classmate for 45s, and lock their skip button (1 use/round).',
      params: { duration: 45 }
    }
  },
  {
    id: 'lucario',
    name: 'Lucario',
    pokedexNumber: 448,
    rarity: 'rare',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/448.png',
    speechStyle: 'wise warrior',
    speeches: {
      idle: ['I sense the aura of a grandmaster.', 'Let aura guide your calculations.', 'A warrior must be precise.', 'Ready to strike with aura power?'],
      thinking: ['Focus your aura. Find the weakness.', 'Look for the forcing sequence.', 'Calculate all threats.', 'The path of the warrior is clear.'],
      correct: ['Aura sphere checkmate! 🔵', 'Superb tactical vision!', 'You executed with absolute precision! 🎉', 'A honorable victory.'],
      incorrect: ['Aura disrupted. Focus your mind.', 'Recalculate with pure focus.', 'Patience. Try another strike.', 'See past the illusion.'],
      hint: ['Focus on the piece that is blocked by its own allies.', 'An aura of vulnerability surrounds their f7 square.', 'Look for a double attack!']
    },
    skill: {
      id: 'coinSteal',
      name: 'Aura Swipe',
      type: 'active',
      description: '💰 Steal 80 coins from a classmate of your choice (1 use/round).',
      params: { amount: 80 }
    }
  },
  {
    id: 'gardevoir',
    name: 'Gardevoir',
    pokedexNumber: 282,
    rarity: 'rare',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/282.png',
    speechStyle: 'elegant',
    speeches: {
      idle: ['I foresee a beautiful combination.', 'Let us play with grace and harmony.', 'A elegant solution awaits us.', 'Ready to defend the king?'],
      thinking: ['Look for the psychic link.', 'How can we align our pieces gracefully?', 'A silent threat is often the deadliest.', 'Calculate the elegant paths.'],
      correct: ['Beautifully solved! Psychic checkmate! ✨', 'Pure chess art!', 'A flawless and elegant victory! 🎉', 'You played beautifully.'],
      incorrect: ['A slight disharmony. Try another path.', 'Grace under pressure. Recalculate.', 'Let us search for a more refined move.', 'Keep calm and retry.'],
      hint: ['Look for a beautiful queen sacrifice!', 'Is there a way to support your attacker from afar?', 'A bishop alignment could be key.']
    },
    skill: {
      id: 'doubleEdge',
      name: 'Double Edge',
      type: 'active',
      description: '💖 Get double coins (+30) if you solve your next puzzle, but lose double (-10) if you get it wrong (1 use/round).',
      params: { multiplier: 2, penaltyMultiplier: 2 }
    }
  },
  {
    id: 'umbreon',
    name: 'Umbreon',
    pokedexNumber: 197,
    rarity: 'rare',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/197.png',
    speechStyle: 'mysterious',
    speeches: {
      idle: ['The moonlight reveals the winning tactic.', 'Let\'s play in the dark...', 'I see a faint glow on the correct square.', 'Ready to strike from the shadows?'],
      thinking: ['Wait for the shadows to align.', 'Look for the quiet, dark move.', 'A silent threat is developing.', 'Patience in the dark.'],
      correct: ['Moonlight checkmate! 🌙', 'You navigated the shadows perfectly!', 'Sublime dark victory! 🎉', 'Brilliant and mysterious.'],
      incorrect: ['The shadow fades. Try again.', 'Recalculate under the moonlight.', 'Not that dark path. Try another.', 'Patience. Re-align.'],
      hint: ['Look for a quiet, defensive pawn move.', 'The knight can jump from the shadows.', 'Is their king trapped in the dark corner?']
    },
    skill: {
      id: 'shield',
      name: 'Shadow Cloak',
      type: 'passive',
      description: '🌙 60% chance to shield wrong-move coin penalties.',
      params: { chance: 0.60 }
    }
  },
  {
    id: 'scizor',
    name: 'Scizor',
    pokedexNumber: 212,
    rarity: 'rare',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/212.png',
    speechStyle: 'sharp',
    speeches: {
      idle: ['Ready to snip their defense! ✂️', 'My claws are sharp, let\'s calculate!', 'Precision is key in this endgame.', 'Let\'s cut through their lines!'],
      thinking: ['Find the sharpest tactical cut!', 'Where is the double attack?', 'Is there a weakness we can chop?', 'Calculate with steel precision.'],
      correct: ['Bullet punch checkmate! 💥', 'Razor-sharp vision!', 'You sliced through their defense! 🎉', 'Perfect steel execution!'],
      incorrect: ['Claws slipped. Try another cut!', 'Recalculate the angles.', 'Keep your guard up. Try again.', 'Sharpen your thoughts!'],
      hint: ['Look for a double attack with the knight!', 'Which piece can be pinned and sliced?', 'Can the rook pierce their defense?']
    },
    skill: {
      id: 'scizorCut',
      name: 'Metal Claw',
      type: 'active',
      description: '⚔️ Reduce a classmate\'s score by 1 solved puzzle (1 use/round).',
      params: { amount: 1 }
    }
  },
  {
    id: 'alakazam',
    name: 'Alakazam',
    pokedexNumber: 65,
    rarity: 'rare',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/065.png',
    speechStyle: 'genius',
    speeches: {
      idle: ['My IQ of 5000 has calculated the win.', 'Spoons aligned, let\'s solve this.', 'Your mental prowess is growing.', 'Ready for some supreme calculations?'],
      thinking: ['I\'ve calculated 400 lines. The win is there.', 'Look for the mathematical breakthrough.', 'Focus your telepathy.', 'Determine the forcing moves.'],
      correct: ['Kinesis checkmate! 🥄', 'An absolute intellectual masterpiece!', 'Calculated to perfection! 🎉', 'Exactly as I foresaw.'],
      incorrect: ['A mathematical error. Recalculate.', 'Check your formulas. Try again.', 'A slight deviation from the optimal path.', 'Re-focus your mind.'],
      hint: ['The solution requires a deflection of the f-pawn.', 'Look for a checkmate that uses the power of three pieces.', 'Is there a way to force their king into a corner?']
    },
    skill: {
      id: 'puzzleFilter',
      name: 'Theme Teleport',
      type: 'active',
      description: '🔮 Force your next puzzle to be of a specific theme (1 use/round).',
      params: {}
    }
  },
  {
    id: 'dragonair',
    name: 'Dragonair',
    pokedexNumber: 148,
    rarity: 'rare',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/148.png',
    speechStyle: 'graceful',
    speeches: {
      idle: ['Let us glide through this classroom.', 'A serene atmosphere brings focus.', 'Let\'s find a beautiful dragon line.', 'Ready to elevate our game?'],
      thinking: ['Look for the flowing sequence.', 'How can we coordinate our pieces like wind?', 'A calm mind sees the board clearly.', 'Let the tactic flow.'],
      correct: ['Dragon breath checkmate! 🐉', 'Flowing and beautiful victory!', 'So graceful! 🎉', 'Perfect tactical flow.'],
      incorrect: ['The flow was interrupted. Try again.', 'Take a deep breath. Recalculate calmly.', 'Search for a more refined move.', 'Stay serene, try again.'],
      hint: ['Look for a long diagonal sweep by your queen.', 'Can we slide a rook down the board smoothly?', 'Is there a way to shield your king?']
    },
    skill: {
      id: 'dragonarRating',
      name: 'Dragon Rank',
      type: 'active',
      description: '🐉 Choose the rating range of your next puzzle (Easy, Medium, Hard) (1 use/round).',
      params: {}
    }
  },
  {
    id: 'absol',
    name: 'Absol',
    pokedexNumber: 359,
    rarity: 'rare',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/359.png',
    speechStyle: 'serious',
    speeches: {
      idle: ['I sense disaster if we blunder.', 'We must play with absolute caution.', 'Focus. The position is critical.', 'Ready to prevent any counterplay?'],
      thinking: ['Where is their threat? Stop it first.', 'Look for the safest path to victory.', 'We must make no mistakes.', 'Calculate every single branch.'],
      correct: ['Disaster averted. Checkmate! ⚔️', 'Absolute precision.', 'Clean and clinical win! 🎉', 'Well calculated.'],
      incorrect: ['A critical blunder. Try again.', 'Caution! Recalculate immediately.', 'Do not let your guard down.', 'Search for the defensive leak.'],
      hint: ['First, make sure your own king is safe!', 'Is there a way to block their active rook?', 'Look for a forcing capture that leaves them helpless.']
    },
    skill: {
      id: 'immunize',
      name: 'Prescience',
      type: 'active',
      description: '🛡️ Become immune to all classmate steals/freezes/drains for 2 mins (1 use/round).',
      params: { duration: 120 }
    }
  },
  {
    id: 'ninetales',
    name: 'Ninetales',
    pokedexNumber: 38,
    rarity: 'rare',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/038.png',
    speechStyle: 'wise, elegant',
    speeches: {
      idle: ['A thousand years of wisdom at your service.', 'Let us play with elegant strategy.', 'Every move must serve a greater purpose.', 'Ready to weave a web of tactics?'],
      thinking: ['Look beyond the immediate. Think ahead.', 'A quiet move can burn their position.', 'Patience. Weave the trap.', 'Calculate the deep lines.'],
      correct: ['Mystical fire checkmate! 🔥', 'Woven to perfection.', 'An elegant victory of pure strategy! 🎉', 'Beautifully executed.'],
      incorrect: ['A slight miscalculation. Try again.', 'Keep your composure. Recalculate.', 'Search for a wiser move.', 'Compose your mind and retry.'],
      hint: ['Look for a quiet, waiting move that creates a zugzwang.', 'The bishop has a long-term goal on that diagonal.', 'Can we decoy their defender?']
    },
    skill: {
      id: 'smokescreen',
      name: 'Will-O-Wisp',
      type: 'active',
      description: '🔥 Cast coordinate-hiding Smokescreen on a classmate for 15 seconds (60s cooldown).',
      params: { duration: 45 }
    }
  },
  {
    id: 'togekiss',
    name: 'Togekiss',
    pokedexNumber: 468,
    rarity: 'rare',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/468.png',
    speechStyle: 'joyful',
    speeches: {
      idle: ['Spread joy and checkmates! ✈️', 'Let\'s fly high on the leaderboard!', 'Solving puzzles brings so much happiness!', 'Ready for a lucky win?'],
      thinking: ['Spread your wings! Look for active moves.', 'Can we glide into their back rank?', 'Think happy thoughts and find the tactic!', 'Where is the joy in this position?'],
      correct: ['Aura sphere checkmate! Sky high! 🌟', 'Yay! A joyful victory! 🎉', 'Such a happy solution!', 'Brilliant glide to win!'],
      incorrect: ['Oops! Let\'s fly back and try again.', 'Don\'t worry, be happy! Retry.', 'A small turbulence. Recalculate!', 'Let\'s find another path!'],
      hint: ['Look for an active check that uses the queen!', 'Can we glide a piece to a protected square?', 'Look for a double attack!']
    },
    skill: {
      id: 'coinBoost',
      name: 'Serene Grace',
      type: 'passive',
      description: '✨ Evolved! Earn +4 extra coins on every solved puzzle.',
      params: { bonus: 4 }
    }
  },
  {
    id: 'persian',
    name: 'Persian',
    pokedexNumber: 53,
    rarity: 'rare',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/053.png',
    speechStyle: 'sleek',
    speeches: {
      idle: ['Sleek and classy... ready for class?', 'My claws are sharper now.', 'Let\'s swipe more coins.', 'Jewel on my head shines!'],
      thinking: ['Sneak... calculate...', 'Wait for their mistake...', 'A clean swipe is coming.', 'Watch their bank.'],
      correct: ['Purr... absolute theft! 🪙', 'Easy swipe! 🎉', 'Gorgeous checkmate.', 'Perfect run.'],
      incorrect: ['Hiss! Spurred, try again.', 'Don\'t panic, recalculate.', 'Stay sleek, retry.', 'Focus.'],
      hint: ['Look for a direct hanging piece!', 'Capture their defender now!', 'A knight fork is open.']
    },
    skill: {
      id: 'coinSteal',
      name: 'Pay Day Plus',
      type: 'active',
      description: '💰 Evolved! Steal 80 coins from a classmate of your choice (1 use/round).',
      params: { amount: 80 }
    }
  },
  {
    id: 'golem',
    name: 'Golem',
    pokedexNumber: 76,
    rarity: 'rare',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/076.png',
    speechStyle: 'heavy',
    speeches: {
      idle: ['Rock hard! Golem roll!', 'Ready to crush their walls?', 'Solid stone defense!', 'Boom! Let\'s go!'],
      thinking: ['Unbreakable... where\'s the wall?', 'Block the lane!', 'Weighty calculations...', 'Think heavy.'],
      correct: ['Steamroller checkmate! 🪨', 'Crushed completely! 🎉', 'Ironclad solution!', 'Unstoppable Golem!'],
      incorrect: ['Chipped! Try again.', 'Recheck your armor, recalculate.', 'Stay rocky, retry.', 'Solidify your lines.'],
      hint: ['Block their rook slider with a solid piece!', 'Push your center pawns!', 'Force the king out.']
    },
    skill: {
      id: 'shield',
      name: 'Golem Shield',
      type: 'passive',
      description: '🛡️ Evolved! 50% chance to shield wrong-move coin penalties.',
      params: { chance: 0.50 }
    }
  },
  {
    id: 'raichu',
    name: 'Raichu',
    pokedexNumber: 26,
    rarity: 'rare',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/026.png',
    speechStyle: 'electric warrior',
    speeches: {
      idle: ['Rai! Thunderbolt ready! ⚡', 'Let\'s supercharge this board!', 'Double voltage chess!', 'Ready to spark a grand victory?'],
      thinking: ['Hyper volt calculations!', 'Find the electric strike!', 'Push forward, no hesitation!', 'Zap their files!'],
      correct: ['Thunderbolt checkmate! ⚡', 'Pure electrical genius! 🎉', 'Zap! Perfect solution!', 'Charged up win!'],
      incorrect: ['Spark shorted. Try again.', 'Discharge error, recalculate.', 'Stay grounded, retry.', 'Check the generator.'],
      hint: ['Attack their queen using an active knight jump!', 'Can you force the king onto a dark square?', 'The diagonal is electrified.']
    },
    skill: {
      id: 'shield',
      name: 'Volt Shield',
      type: 'passive',
      description: '⚡ Evolved! 75% chance to shield wrong-move coin penalties.',
      params: { chance: 0.75 }
    }
  },
  {
    id: 'aggron',
    name: 'Aggron',
    pokedexNumber: 306,
    rarity: 'rare',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/306.png',
    speechStyle: 'unbreakable steel',
    speeches: {
      idle: ['Clang! Heavy armor ready!', 'Let\'s build an iron fortress!', 'Ready to crush their lines?', 'Unstoppable steel!'],
      thinking: ['Unbreakable guard... where is it?', 'Block their main files!', 'Heavy positional search...', 'Calculate the iron wall.'],
      correct: ['Iron head checkmate! 🛡️', 'Unbreakable victory! 🎉', 'Perfect steel guard!', 'Clean win.'],
      incorrect: ['Clang! Armor dented, try again.', 'Recheck the shield, recalculate.', 'Stay sturdy, retry.', 'Check your flank.'],
      hint: ['Look for a way to lock the center of the board with a pawn!', 'Can we shield our rook from attack?', 'Look for a solid check.']
    },
    skill: {
      id: 'aggronSturdy',
      name: 'Sturdy Steel',
      type: 'passive',
      description: '🛡️ Evolved! The first 2 wrong moves of the round are guaranteed to be 100% shielded.',
      params: {}
    }
  },

  // ── EPICS ──
  {
    id: 'charizard',
    name: 'Charizard',
    pokedexNumber: 6,
    rarity: 'epic',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/006.png',
    speechStyle: 'fierce',
    speeches: {
      idle: ['ROAR! Let\'s incinerate their defense!', 'I only play the most aggressive lines!', 'Ready for a blazing checkmate?', 'Nothing can withstand our tactical fire!'],
      thinking: ['Blaze through! Look for the attack!', 'Sacrifice! Open up their king! 🔥', 'Attack! Calculate the mating net!', 'No passive moves allowed!'],
      correct: ['Seismic Toss checkmate! Burn! 🔥', 'Absolute destruction of their defense!', 'We roasted them! 🎉', 'Fierce and unstoppable!'],
      incorrect: ['ROAR! A misfire! Try again!', 'Don\'t cool down! Recalculate!', 'Keep the attack alive! Retry!', 'Attack from another angle!'],
      hint: ['Look for an aggressive sacrifice on f7!', 'Is there a way to bring your queen directly to the attack?', 'Use the power of your active rook!']
    },
    skill: {
      id: 'frenzy',
      name: 'Blast Burn',
      type: 'active',
      description: '🔥 Evolved! Earn double coins (+30) on solves, but lose double (-10) on mistakes for 45s (1 use/round).',
      params: { duration: 45 }
    }
  },
  {
    id: 'blastoise',
    name: 'Blastoise',
    pokedexNumber: 9,
    rarity: 'epic',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/009.png',
    speechStyle: 'tactical',
    speeches: {
      idle: ['Hydro cannons loaded! Let\'s blast!', 'A heavy shell keeps us safe.', 'Ready to launch a tactical flood?', 'Defense first, then the counter-blast!'],
      thinking: ['Calculate the pressure! Flood their lines!', 'Is our king completely secure?', 'Look for the heavy tactical blast.', 'Coordinate the heavy pieces.'],
      correct: ['Hydro pump checkmate! Blasted! 🌊', 'Maximum pressure applied!', 'Unbreakable tactical victory! 🎉', 'Solid and powerful.'],
      incorrect: ['Cannons jammed. Recalculate!', 'Fortify your defense and try again.', 'Pressure dropped. Try another line.', 'Keep your shell tight.'],
      hint: ['Look for a heavy rook slide to create double threats.', 'Can we use a pawn to block their counter-attack?', 'Pin that knight to win their rook!']
    },
    skill: {
      id: 'blastoiseCannon',
      name: 'Hydro Cannon',
      type: 'passive',
      description: '🌊 Evolved! 65% chance to shield wrong-move coin penalties, and grants +1 extra skip.',
      params: { chance: 0.65, amount: 1 }
    }
  },
  {
    id: 'venusaur',
    name: 'Venusaur',
    pokedexNumber: 3,
    rarity: 'epic',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/003.png',
    speechStyle: 'ancient wisdom',
    speeches: {
      idle: ['The roots of chess run deep.', 'Let us draw power from the earth.', 'A solid foundation guarantees victory.', 'Ready to stand unshakable?'],
      thinking: ['Observe the whole board. Do not rush.', 'Find the roots of their defense.', 'Positional strength is everything.', 'Let the plan grow.'],
      correct: ['Frenzy plant checkmate! 🌿', 'Deep strategic victory!', 'You stood unshakable and won! 🎉', 'An absolute masterclass.'],
      incorrect: ['The branch broke. Try another root.', 'Patience. Recalculate with care.', 'Do not rush the blossom. Try again.', 'Reflect on your strategy.'],
      hint: ['Look for a deep bishop sacrifice to open their king.', 'Pin their active pieces to restrict their growth.', 'A quiet pawn push will seal their fate.']
    },
    skill: {
      id: 'coinBoost',
      name: 'Frenzy Plant',
      type: 'passive',
      description: '🌿 Evolved! Earn +5 extra coins on every solved puzzle.',
      params: { bonus: 5 }
    }
  },
  {
    id: 'gyarados',
    name: 'Gyarados',
    pokedexNumber: 130,
    rarity: 'epic',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/130.png',
    speechStyle: 'intense',
    speeches: {
      idle: ['RAAAGH! Rage on the board! 🐉', 'Let\'s crush their pieces with fury!', 'No mercy! We win now!', 'Ready to unleash the hyper beam?'],
      thinking: ['Rage breakthrough! Attack! Attack!', 'Crush their king! Calculate the mate!', 'No passive moves! Find the crush!', 'We must break their defenses by force!'],
      correct: ['Hyper beam checkmate! CRUSHED! 💥', 'Unleashed pure tactical fury!', 'They were completely swept away! 🎉', 'Incredible power!'],
      incorrect: ['RAAGH! A blunder! Try again!', 'Channel the rage into calculation!', 'Recalculate the crush!', 'Try a more aggressive line!'],
      hint: ['Look for an absolute crush on their castled king!', 'Which piece can we sacrifice to open up the lines?', 'Attack the f7/f2 weakness!']
    },
    skill: {
      id: 'waterblast',
      name: 'Water Blast',
      type: 'active',
      description: '💧 Splash a water torrent! Paralyzes a classmate\'s board for 30 seconds (90s cooldown).',
      params: { duration: 15 }
    }
  },
  {
    id: 'tyranitar',
    name: 'Tyranitar',
    pokedexNumber: 248,
    rarity: 'epic',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/248.png',
    speechStyle: 'mighty',
    speeches: {
      idle: ['Let\'s kick up a sandstorm on the board!', 'We crush everything in our path.', 'Ready to break their stone defenses?', 'A solid rock game is unbeatable.'],
      thinking: ['Crush their structure! Stone by stone.', 'We have the heavy artillery. Use it.', 'Look for the breakthrough.', 'Calculate with force.'],
      correct: ['Stone edge checkmate! 🪨', 'Absolute structural destruction!', 'You crushed their position completely! 🎉', 'Mighty execution.'],
      incorrect: ['Slipped on the sand. Try again.', 'Fortify your calculations. Retry.', 'Keep the sandstorm going. Recalculate.', 'A minor tremor, try another move.'],
      hint: ['Look for a way to ruin their pawn structure!', 'Can we use our rook to break their shield?', 'Attack the pinned piece with a pawn!']
    },
    skill: {
      id: 'tyranitarSand',
      name: 'Sandstorm',
      type: 'active',
      description: '🌫️ Smokescreen ALL other classmates for 30 seconds simultaneously (1 use/round).',
      params: { duration: 30 }
    }
  },
  {
    id: 'salamence',
    name: 'Salamence',
    pokedexNumber: 373,
    rarity: 'epic',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/373.png',
    speechStyle: 'proud, noble',
    speeches: {
      idle: ['We fly above their simple tactics.', 'A noble dragon demands a noble checkmate.', 'Ready to sweep down from the sky?', 'Let\'s show them our aerial mastery!'],
      thinking: ['Look at the board from above. See the big picture.', 'Find the high-flying tactic.', 'Can we swoop into their king\'s camp?', 'Calculate the sweeping lines.'],
      correct: ['Dragon claw checkmate! 🐉', 'Swept them aside with style!', 'A noble and high-flying win! 🎉', 'Beautifully executed.'],
      incorrect: ['Turbulence! Adjust your flight path.', 'Recalculate from a higher perspective.', 'A noble warrior tries again.', 'A slight descent, try another move.'],
      hint: ['Look for a sweeping rook move from the open file.', 'Is there an diagonal your queen can command?', 'Swoop in with a knight check!']
    },
    skill: {
      id: 'windattack',
      name: 'Cyclone Wing',
      type: 'active',
      description: '🍃 Flap massive wings! Blows a classmate\'s chess pieces away (drifts coordinates) for 30 seconds (90s cooldown).',
      params: { duration: 15 }
    }
  },
  {
    id: 'metagross',
    name: 'Metagross',
    pokedexNumber: 376,
    rarity: 'epic',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/376.png',
    speechStyle: 'super-computer',
    speeches: {
      idle: ['Analyzing board configuration...', 'Four brains synchronized for chess.', 'Optimization process initiated.', 'Ready to compute the win?'],
      thinking: ['Processing 10,000 operations per second...', 'Checking all defensive permutations...', 'Optimal path located. Calculating...', 'Evaluating king safety index...'],
      correct: ['Meteor mash checkmate! ☄️', 'Solution optimized. 100% accuracy!', 'Tactic completed successfully. 🎉', 'Computational perfection.'],
      incorrect: ['Error detected. Recalculating...', 'Re-evaluating board state. Retry.', 'A slight deviation from the computed line.', 'Recheck inputs.'],
      hint: ['Look for a tactical sequence that starts with a forced capture.', 'The computed optimal move involves a rook lift.', 'Target coordinates: f7. Calculate checkmate.']
    },
    skill: {
      id: 'shield',
      name: 'Iron Defense',
      type: 'passive',
      description: '🤖 80% chance to shield wrong-move coin penalties.',
      params: { chance: 0.80 }
    }
  },
  {
    id: 'dragonite',
    name: 'Dragonite',
    pokedexNumber: 149,
    rarity: 'epic',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/149.png',
    speechStyle: 'friendly giant',
    speeches: {
      idle: ['Hi there! Ready to fly through this puzzle?', 'Let\'s help our pieces work together!', 'A friendly game is a winning game.', 'Ready for a big dragon hug checkmate?'],
      thinking: ['Hmm, let\'s look at all our friends on the board.', 'How can we support our team?', 'Look for a big, kind move that saves the day.', 'Let\'s calculate together!'],
      correct: ['Dragon rush checkmate! Yay! 🐉', 'You did an awesome job! 🎉', 'Friendly victory! That was great!', 'Superb combination!'],
      incorrect: ['Oops! Let\'s fly back and try again.', 'Don\'t worry, even dragons make mistakes!', 'Let\'s find a better square together.', 'Try another path, buddy!'],
    },
    skill: {
      id: 'extraSkips',
      name: 'Dragon Glide',
      type: 'passive',
      description: '🐉 Grants +1 extra skip, and +3 coins on every solved puzzle.',
      params: { amount: 1, bonus: 3 }
    }
  },
  {
    id: 'garchomp',
    name: 'Garchomp',
    pokedexNumber: 445,
    rarity: 'epic',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/445.png',
    speechStyle: 'fast, aggressive',
    speeches: {
      idle: ['Ready to slash through their lines? 🦈', 'Speed and power will win this!', 'Let\'s hunt down their king!', 'No passive play, let\'s attack!'],
      thinking: ['Find the quickest path! Slash their defense!', 'Aggressive breakthrough needed!', 'Can we open up their king right now?', 'No hesitation, calculate the win!'],
      correct: ['Earthquake checkmate! Slashed! 💥', 'Fast and absolutely lethal! 🎉', 'You hunted down their king! 🎉', 'Total tactical speed!'],
      incorrect: ['Missed the slash! Recalculate!', 'Keep your momentum! Try again.', 'Too slow, find a faster line.', 'Attack again immediately!'],
      hint: ['Look for a quick knight check that wins their queen!', 'Is there a way to open up the center file?', 'Attack their defender now!']
    },
    skill: {
      id: 'scizorCut',
      name: 'Dual Claw',
      type: 'active',
      description: '⚔️ Reduce a classmate\'s score by 1 solved puzzle, and steal 60 coins from them (1 use/round).',
      params: { amount: 1, steal: 60 }
    }
  },
  {
    id: 'hydreigon',
    name: 'Hydreigon',
    pokedexNumber: 635,
    rarity: 'epic',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/635.png',
    speechStyle: 'dark, intense',
    speeches: {
      idle: ['Three heads see three ways to win! 🐉', 'Let\'s unleash dark tactical power!', 'Ready to tear their defense apart?', 'Our dark energy is unstoppable!'],
      thinking: ['Three heads calculating simultaneously...', 'Look for the most destructive move.', 'We must devour their defense!', 'Calculate the dark combination.'],
      correct: ['Dark pulse checkmate! Devoured! 🟣', 'Total destruction of their lines!', 'Three heads celebrate! 🎉', 'Intense and brilliant win!'],
      incorrect: ['A head blundered! Recalculate!', 'Focus all three heads and try again.', 'Don\'t lose your focus. Retry.', 'Try another dark path!'],
      hint: ['Look for a check that attacks two pieces at once!', 'Which piece is completely undefended? Devour it!', 'A queen sacrifice will open the gate.']
    },
    skill: {
      id: 'coinSteal',
      name: 'Triple Chomp',
      type: 'active',
      description: '💰 Steal 90 coins from a classmate of your choice (1 use/round).',
      params: { amount: 90 }
    }
  },
  {
    id: 'mew',
    name: 'Mew',
    pokedexNumber: 151,
    rarity: 'epic',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/151.png',
    speechStyle: 'playful myth',
    speeches: {
      idle: ['Mew! Magic is in the air!', 'Chess is a puzzle game, let\'s play!', 'Everything is possible!', 'Let\'s make a wish!'],
      thinking: ['Floating around... let\'s find the secret!', 'Look closely at the magical diagonal!', 'A simple check will clear the way.', 'Psychic calculations!'],
      correct: ['Mew! Magic solved! 🌟', 'An absolute miracle move! 🎉', 'So fun to win!', 'Magic victory!'],
      incorrect: ['Mew... magic fizzled out! Try again.', 'No worries, try another magical path.', 'Let\'s play another move.', 'Rethink!'],
      hint: ['Look for an active bishop pin!', 'Can we use a knight to fork their king?', 'Is the queen open to check?']
    },
    skill: {
      id: 'freeHint',
      name: 'Miracle Call',
      type: 'active',
      description: '🔮 Allows you to "Ask Coach" for free (bypassing the coin cost, 1 use/round).',
      params: {}
    }
  },
  {
    id: 'celebi',
    name: 'Celebi',
    pokedexNumber: 251,
    rarity: 'epic',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/251.png',
    speechStyle: 'time traveller',
    speeches: {
      idle: ['Celebi! Traveling through time!', 'I\'ve seen the future, you win!', 'Patience, the solution exists.', 'Let\'s guide the pieces.'],
      thinking: ['Rewinding time in my mind...', 'Patience... look at the coordinates.', 'Is f7 safe?', 'Focusing...'],
      correct: ['Time travel solved! ⏳', 'A timeless positional victory! 🎉', 'Perfect execution!', 'Exactly as I foresaw.'],
      incorrect: ['A temporal error. Try again.', 'Rewind and recalculate.', 'Not that timeline, retry.', 'Patience.'],
      hint: ['Look for a quiet pawn push to restrict their knight.', 'Pin their active defender.', 'Check f7!']
    },
    skill: {
      id: 'addTime',
      name: 'Time Travel',
      type: 'active',
      description: '⏳ Adds +15 seconds to the classroom round timer for everyone (1 use/round).',
      params: { seconds: 15 }
    }
  },
  {
    id: 'jirachi',
    name: 'Jirachi',
    pokedexNumber: 385,
    rarity: 'epic',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/385.png',
    speechStyle: 'wish maker',
    speeches: {
      idle: ['Jirachi! Make a wish for victory!', 'I\'ll grant you a chess wish!', 'A positive mind wins!', 'Ready to solve this?'],
      thinking: ['Wish calculations...', 'Looking for the perfect square...', 'Calculate with hope!', 'A bright idea...'],
      correct: ['Wish granted! Solved! 🌠', 'A glorious victory! 🎉', 'You played beautifully!', 'Starry checkmate!'],
      incorrect: ['Wish faded. Try again.', 'Keep hoping! Recalculate.', 'Search for a better move.', 'Retry with a wish.'],
      hint: ['Look for a brilliant sacrifice!', 'Pin their knight.', 'Check f7!']
    },
    skill: {
      id: 'jirachiWish',
      name: 'Star Wish',
      type: 'active',
      description: '🌠 Gain a random benefit: +25 coins, +1 skip, or a free Hint Token (1 use/round).',
      params: {}
    }
  },
  {
    id: 'kyogre',
    name: 'Kyogre',
    pokedexNumber: 382,
    rarity: 'epic',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/382.png',
    speechStyle: 'ocean god',
    speeches: {
      idle: ['The ocean pressure rises!', 'Let\'s flood their defense!', 'Unleash the storm!', 'Unstoppable seas!'],
      thinking: ['Flood their files! Coordinate the pieces.', 'Find the massive pressure point.', 'Look for the tidal breakthrough.', 'Calculate with sea force.'],
      correct: ['Origin pulse checkmate! 🌊', 'Unbreakable water victory! 🎉', 'Unstoppable flood!', 'Magnificent.'],
      incorrect: ['Storm cleared. Try again.', 'Check your flank, recalculate.', 'Stay massive, retry.', 'Solidify your lines.'],
      hint: ['Look for a heavy rook slide down the file!', 'Can we push a pawn to open their king?', 'Look for a double attack.']
    },
    skill: {
      id: 'coinBoost',
      name: 'Drizzle Storm',
      type: 'passive',
      description: '🌧️ Earn +5 extra coins on solves, but wrong moves cost -8 coins.',
      params: { bonus: 5, penalty: -8 }
    }
  },
  {
    id: 'groudon',
    name: 'Groudon',
    pokedexNumber: 383,
    rarity: 'epic',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/383.png',
    speechStyle: 'earth god',
    speeches: {
      idle: ['The earth trembles!', 'Let\'s shatter their structure!', 'Unleash the drought!', 'Unshakable land!'],
      thinking: ['Shatter their files! Crush the defense.', 'Find the tectonic weakness.', 'Look for the earthquake breakthrough.', 'Calculate with land force.'],
      correct: ['Precipice blades checkmate! 🌋', 'Unshakable earth victory! 🎉', 'Unstoppable crush!', 'Magnificent.'],
      incorrect: ['Earthquake missed. Try again.', 'Check your shield, recalculate.', 'Stay grounded, retry.', 'Solidify your lines.'],
      hint: ['Look for a direct pawn break to open the center!', 'Can we use our rook to break their wall?', 'Look for a check.']
    },
    skill: {
      id: 'groudonDrought',
      name: 'Drought Strike',
      type: 'passive',
      description: '☀️ Earn +4 extra coins per solve; increases to +8 extra coins on a 3+ puzzle streak.',
      params: { baseBonus: 4, streakBonus: 8, streakThreshold: 3 }
    }
  },

  // ── LEGENDARIES ──
  {
    id: 'mewtwo',
    name: 'Mewtwo',
    pokedexNumber: 150,
    rarity: 'legendary',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/150.png',
    speechStyle: 'calculating',
    speeches: {
      idle: ['I have computed all possible checkmates.', 'My psychic mind is unmatched.', 'Let us execute the ultimate combination.', 'Humans blunder... I do not.'],
      thinking: ['Evaluating all forcing lines...', 'Your mind must be absolute. Focus.', 'The correct square has been located.', 'Do not get distracted by cheap tricks.'],
      correct: ['Psystrike checkmate. Absolute victory. 🟣', 'A perfect calculation of tactical force.', 'You showed supreme intellect. 🎉', 'Precisely as calculated.'],
      incorrect: ['An illogical move. Recalculate.', 'Correct your logic. Try again.', 'You missed a critical branch. Re-evaluate.', 'Focus your psychic energy.'],
      hint: ['The optimal sequence begins with a double check.', 'You must sacrifice the rook to force the king out.', 'Look for the weak back rank.']
    },
    skill: {
      id: 'scizorCut',
      name: 'Psychic Drain',
      type: 'active',
      description: '🧠 Deduct 1 solved puzzle from today\'s class leader (1 use/round).',
      params: { amount: 1 }
    }
  },
  {
    id: 'rayquaza',
    name: 'Rayquaza',
    pokedexNumber: 384,
    rarity: 'legendary',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/384.png',
    speechStyle: 'majestic',
    speeches: {
      idle: ['Descending from the ozone layer to win.', 'A legendary king demands a legendary checkmate.', 'Ready to command the entire board?', 'Let\'s unleash the dragon ascend!'],
      thinking: ['Look at the board from the heavens.', 'The tactical path stretches across the sky.', 'Calculate the sweeping attack.', 'Focus your legendary power.'],
      correct: ['Dragon ascend checkmate! Majestic! 🐉', 'A victory worthy of the heavens!', 'Absolute tactical supremacy! 🎉', 'Magnificent execution.'],
      incorrect: ['A minor storm. Adjust your course.', 'Recalculate from the sky. Retry.', 'A legendary mind never yields. Try again.', 'Recheck the lines.'],
      hint: ['Look for a sweeping queen move that crosses the entire board.', 'Can we slide our rook to the ozone (8th rank)?', 'A knight fork is hiding in the clouds.']
    },
    skill: {
      id: 'extraSkips',
      name: 'Air Lock',
      type: 'passive',
      description: '💨 Grants +2 extra skips at the start of the round.',
      params: { amount: 2 }
    }
  },
  {
    id: 'lugia',
    name: 'Lugia',
    pokedexNumber: 249,
    rarity: 'legendary',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/249.png',
    speechStyle: 'serene',
    speeches: {
      idle: ['Calming the storm to bring tactical focus.', 'A serene mind executes the best moves.', 'Ready to dive deep into calculation?', 'Let us play with deep wisdom.'],
      thinking: ['Look beneath the surface. Deep thoughts.', 'How do our pieces coordinate in the deep?', 'A quiet threat is most powerful.', 'Stay calm and calculate.'],
      correct: ['Aeroblast checkmate! Serene win! 🌊', 'A masterclass of calm strategy.', 'Deeply calculated and solved! 🎉', 'Perfect harmony.'],
      incorrect: ['A slight ripple in the water. Try again.', 'Deep breath. Recalculate calmly.', 'Search for a more serene square.', 'Composition is key. Retry.'],
      hint: ['Look for a quiet, defensive bishop move that shields your king.', 'Can you pin their queen to the king?', 'Is there a back-rank rook slide?']
    },
    skill: {
      id: 'shield',
      name: 'Aeroblast Guard',
      type: 'passive',
      description: '🌊 70% chance to shield wrong-move coin penalties, and earns +2 extra coins per solve.',
      params: { chance: 0.70, bonus: 2 }
    }
  },
  {
    id: 'ho_oh',
    name: 'Ho-Oh',
    pokedexNumber: 250,
    rarity: 'legendary',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/250.png',
    speechStyle: 'radiant',
    speeches: {
      idle: ['Rainbows on the board! Let\'s shine!', 'Ready for a radiant checkmate?', 'A golden strategy brings victory.', 'Unleash the sacred tactical fire!'],
      thinking: ['Look for the most brilliant line!', 'Let the solution shine through the fog.', 'Sacrifice! Let the fire burn bright!', 'Calculate with radiant focus.'],
      correct: ['Sacred fire checkmate! Radiant! 🔥', 'A brilliant and golden victory! 🎉', 'You shone brightly on the board!', 'Pure tactical gold!'],
      incorrect: ['The fire dimmed. Try again.', 'Rise from the ashes! Recalculate.', 'Search for a more brilliant move.', 'Keep the flame alive, retry!'],
      hint: ['Look for a brilliant sacrifice on g7!', 'Is there a way to bring your bishop into a radiant pin?', 'Look for a quick checkmate!']
    },
    skill: {
      id: 'hoohSacred',
      name: 'Sacred Rebirth',
      type: 'passive',
      description: '🔥 Solves give +5 coins. First wrong-move penalty of the round is 100% shielded.',
      params: { bonus: 5 }
    }
  },
  {
    id: 'arceus',
    name: 'Arceus',
    pokedexNumber: 493,
    rarity: 'legendary',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/493.png',
    speechStyle: 'divine',
    speeches: {
      idle: ['The creator of the universe commands the board.', 'All tactics are born from my vision.', 'Ready to execute divine justice?', 'A flawless player has arrived.'],
      thinking: ['I see all variations instantly.', 'Let the divine plan unfold.', 'Find the cosmic order in this position.', 'Calculate with absolute focus.'],
      correct: ['Judgment checkmate! Divine! 🌟', 'A victory ordained by the heavens!', 'Flawless strategic execution! 🎉', 'Exactly as ordained.'],
      incorrect: ['A slight deviation from the divine path.', 'Correct your course. Recalculate.', 'No errors allowed on this board.', 'Try again with pure focus.'],
      hint: ['The solution involves a checkmate in exactly two moves.', 'Pin their knight to the king. It is written.', 'Look for the open diagonal.']
    },
    skill: {
      id: 'arceusDivine',
      name: 'Judgment',
      type: 'passive',
      description: '🌌 Earn +10 extra coins on solves, and starts with +1 extra skip.',
      params: { bonus: 10, amount: 1 }
    }
  },
  {
    id: 'giratina',
    name: 'Giratina',
    pokedexNumber: 487,
    rarity: 'legendary',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/487.png',
    speechStyle: 'dark, powerful',
    speeches: {
      idle: ['Tearing through the distortion world to checkmate.', 'Welcome to my shadow realm.', 'Ready to distort their defense?', 'A dark checkmate awaits...'],
      thinking: ['Look for the move that distorts the board.', 'Can we strike from the distortion world?', 'Calculate the shadow tactical strike.', 'Break their structure completely.'],
      correct: ['Shadow force checkmate! Distorted! 🟣', 'You completely bent the rules to win!', 'A dark and powerful victory! 🎉', 'Masterfully distorted.'],
      incorrect: ['Distortion failed. Try another angle.', 'Shadow faded. Recalculate.', 'Do not lose your dark focus.', 'Recheck the lines.'],
      hint: ['Look for a check that forces their king into a self-block!', 'Is there a way to slide your queen into their camp invisibly?', 'A double check is extremely powerful.']
    },
    skill: {
      id: 'scizorCut',
      name: 'Shadow Force',
      type: 'active',
      description: '👻 Deduct 2 solved puzzles from Today\'s leader (1 use/round).',
      params: { amount: 2 }
    }
  },
  {
    id: 'dialga',
    name: 'Dialga',
    pokedexNumber: 483,
    rarity: 'legendary',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/483.png',
    speechStyle: 'patient',
    speeches: {
      idle: ['Time is fully under our control.', 'A patient player always finds the win.', 'Ready to freeze time for checkmate?', 'Take all the time you need... I control it.'],
      thinking: ['Patience. Rewind the lines in your head.', 'Look for the move that controls the tempo.', 'Calculate the slow, squeezing strategy.', 'Time is on our side.'],
      correct: ['Roar of Time checkmate! Chrono win! ⏳', 'A timeless positional masterpiece!', 'Perfect control of the game flow! 🎉', 'Brilliant patience.'],
      incorrect: ['A temporal error. Rewind and try again.', 'Don\'t rush. Recalculate patient.', 'A slight delay in time. Try another path.', 'Rewind your thoughts.'],
      hint: ['Look for a quiet, patient pawn move that restricts their knight.', 'Pin their active defender and wait.', 'Is there a back-rank threat we can prepare?']
    },
    skill: {
      id: 'freeze',
      name: 'Roar of Time',
      type: 'active',
      description: '⏳ Freeze a classmate\'s board for 40 seconds so they cannot solve (120s cooldown).',
      params: { duration: 30 }
    }
  },
  {
    id: 'palkia',
    name: 'Palkia',
    pokedexNumber: 484,
    rarity: 'legendary',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/484.png',
    speechStyle: 'vast mind',
    speeches: {
      idle: ['Warping space to create tactical wins.', 'The geometry of the board is mine.', 'Ready to jump across files and ranks?', 'Space is just an illusion.'],
      thinking: ['Analyze the spatial coordinates.', 'Look for the long-range sniper move.', 'Can we warp a piece to their back rank?', 'Calculate the spatial geometry.'],
      correct: ['Spacial rend checkmate! Warped! 🌌', 'Beautiful spatial control!', 'A majestic long-range victory! 🎉', 'Perfect geometry.'],
      incorrect: ['Spatial coordinate error. Try again.', 'Check the lines. Recalculate.', 'Don\'t crowd your pieces. Try another path.', 'Re-warp your strategy.'],
      hint: ['Look for a long diagonal bishop slide.', 'Can you slide a rook across the entire board to attack?', 'Is there a way to open up the files?']
    },
    skill: {
      id: 'warpSwap',
      name: 'Spacial Warp',
      type: 'active',
      description: '🌀 Swap your active puzzle with a classmate\'s active puzzle (1 use/round).',
      params: {}
    }
  },
  {
    id: 'reshiram',
    name: 'Reshiram',
    pokedexNumber: 643,
    rarity: 'legendary',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/643.png',
    speechStyle: 'truth-seeker',
    speeches: {
      idle: ['Seeking the absolute truth on the board.', 'Only the correct move represents truth.', 'Ready to burn away illusions?', 'Let\'s find the true path!'],
      thinking: ['Discard all false lines.', 'Calculate with absolute honesty.', 'Look for the true tactical spark.', 'Where is the objective win?'],
      correct: ['Blue flare checkmate! Truth revealed! 🔵', 'The absolute true solution! 🎉', 'You saw through all the lies! 🎉', 'Supreme execution.'],
      incorrect: ['A false path. Recalculate.', 'Search for the truth again.', 'Do not follow illusions. Retry.', 'Recheck the lines.'],
      hint: ['Look for a forced queen check that leaves no room for lies.', 'Which piece is the true defender? Remove it!', 'A simple check will reveal their weakness.']
    },
    skill: {
      id: 'firstMoveReveal',
      name: 'Future Sight',
      type: 'active',
      description: '🔮 Instantly reveals the first correct move of your current puzzle (1 use/round).',
      params: {}
    }
  },
  {
    id: 'zekrom',
    name: 'Zekrom',
    pokedexNumber: 644,
    rarity: 'legendary',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/644.png',
    speechStyle: 'bold idealist',
    speeches: {
      idle: ['Ready to fight for our ideals! ⚡', 'A bold player finds the boldest wins.', 'Ready to strike with lightning force?', 'Let\'s execute our master plan!'],
      thinking: ['Bold action required! Look for the check!', 'Break their shield with lightning!', 'Calculate the most active line.', 'Do not play passively!'],
      correct: ['Bolt strike checkmate! Electrified! ⚡', 'A bold and ideal victory! 🎉', 'You broke them down with style!', 'Powerfully executed.'],
      incorrect: ['Our ideals faltered. Try again!', 'Stay bold! Recalculate immediately.', 'A power surge error. Try another move.', 'Keep fighting!'],
      hint: ['Look for a bold knight check that forks their king and rook!', 'Can we use our active rook to break their wall?', 'Charge in with the queen!']
    },
    skill: {
      id: 'paralyze',
      name: 'Bolt Strike',
      type: 'active',
      description: '⚡ Paralyze a classmate\'s board for 30 seconds with an electric shock (90s cooldown).',
      params: { duration: 30 }
    }
  },
  {
    id: 'solgaleo',
    name: 'Solgaleo',
    pokedexNumber: 791,
    rarity: 'legendary',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/791.png',
    speechStyle: 'solar king',
    speeches: {
      idle: ['The sun rises on our board!', 'Let\'s crush their defense!', 'Golden victory awaits!', 'Unleash the solar blast!'],
      thinking: ['Heat up the calculations.', 'A bright solar plan is emerging.', 'Look for the primary threat.', 'Calculate the lines.'],
      correct: ['Sunsteel checkmate! ☀️', 'Brilliant victory! 🎉', 'You lit up the board!', 'Pure solar gold!'],
      incorrect: ['Solar eclipse. Try again.', 'Stay bright! Recalculate.', 'Search for a better path.', 'Retry.'],
    },
    skill: {
      id: 'coinSteal',
      name: 'Sunsteel Strike',
      type: 'active',
      description: '🦁 Super Coin Steal! Steal 100 coins from a classmate of your choice (90s cooldown).',
      params: { amount: 100 }
    }
  },
  {
    id: 'lunala',
    name: 'Lunala',
    pokedexNumber: 792,
    rarity: 'legendary',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/792.png',
    speechStyle: 'lunar queen',
    speeches: {
      idle: ['The moon glows on our side!', 'Let\'s shadow their coordinates!', 'Silver victory awaits!', 'Unleash the moongeist beam!'],
      thinking: ['Shadowy calculations...', 'A silver lunar plan is emerging.', 'Look for the quiet threat.', 'Calculate the lines.'],
      correct: ['Moongeist checkmate! 🌙', 'Mystic victory! 🎉', 'Navigated the shadow! 🎉', 'Pure lunar silver!'],
      incorrect: ['Lunar eclipse. Try again.', 'Stay calm! Recalculate.', 'Search for a darker path.', 'Retry.'],
    },
    skill: {
      id: 'lunalaSteal',
      name: 'Moongeist Beam',
      type: 'active',
      description: '🦇 Steal 100 coins from a classmate and cast coordinate-hiding Smokescreen on them for 30s (90s cooldown).',
      params: { amount: 100, duration: 30 }
    }
  },
  {
    id: 'necrozma',
    name: 'Necrozma',
    pokedexNumber: 800,
    rarity: 'legendary',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/800.png',
    speechStyle: 'prism beast',
    speeches: {
      idle: ['Absorbing the light of the board!', 'No light will escape my grasp!', 'Prism defense active!', 'Let\'s laser their positions!'],
      thinking: ['Prism refraction check...', 'Dark calculation...', 'Where is the light?', 'Focus the laser.'],
      correct: ['Prism laser checkmate! 💎', 'Refracted victory! 🎉', 'You stole the light! 🎉', 'Flawless.'],
      incorrect: ['Light refracted poorly. Try again.', 'Re-focus your lasers, recalculate.', 'Stay dark, retry.', 'Check inputs.'],
    },
    skill: {
      id: 'leaderSteal',
      name: 'Prism Laser',
      type: 'active',
      description: '💎 Steal 50 coins from the current round leader on the scoreboard (120s cooldown).',
      params: { amount: 50 }
    }
  },
  {
    id: 'zacian',
    name: 'Zacian',
    pokedexNumber: 888,
    rarity: 'legendary',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/888.png',
    speechStyle: 'sword hero',
    speeches: {
      idle: ['The sword of justice is drawn!', 'A hero calculates with sharpness.', 'Ready to cut the puzzle?', 'Let\'s slice their defense!'],
      thinking: ['Precision slice calculation...', 'Sharp tactical search...', 'Attack f7!', 'Find the opening.'],
      correct: ['Behemoth Blade checkmate! ⚔️', 'Sharp victory! 🎉', 'Perfect cut!', 'Clean win.'],
      incorrect: ['Missed the cut! Try again.', 'Re-sharpen your lines, recalculate.', 'Stay noble, retry.', 'Check your posture.'],
    },
    skill: {
      id: 'autoSolveFirst',
      name: 'Behemoth Blade',
      type: 'active',
      description: '⚔️ Instantly auto-plays the first correct move of your current puzzle (1 use/round).',
      params: {}
    }
  },
  {
    id: 'zamazenta',
    name: 'Zamazenta',
    pokedexNumber: 889,
    rarity: 'legendary',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/889.png',
    speechStyle: 'shield hero',
    speeches: {
      idle: ['The shield of honor is ready!', 'A hero calculations with defense.', 'Ready to defend the board?', 'Unbreakable guard!'],
      thinking: ['Secure the perimeter! Check their files.', 'Find the defensive barrier.', 'Pawn wall solid.', 'Calculate the block.'],
      correct: ['Behemoth Bash checkmate! 🛡️', 'Unbreakable victory! 🎉', 'Flawless guard!', 'Solid win.'],
      incorrect: ['Guard breached! Try again.', 'Re-fortify the shield, recalculate.', 'Stay steadfast, retry.', 'Check your flank.'],
    },
    skill: {
      id: 'zamazentaShield',
      name: 'Dauntless Shield',
      type: 'passive',
      description: '🛡️ Gives you 100% immunity to wrong-move coin penalties for the first 3 wrong moves of the round.',
      params: { maxImmunities: 3 }
    }
  },
  {
    id: 'greninja',
    name: 'Greninja',
    pokedexNumber: 658,
    rarity: 'epic',
    price: null,
    spriteUrl: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/658.png',
    speechStyle: 'ninja',
    speeches: {
      idle: ['Silent as a shadow ninja.', 'Water Shuriken ready!'],
      thinking: ['Strike from the dark squares.', 'Swift ninja tactics.'],
      correct: ['Water Shuriken checkmate! 🗡️', 'Shadow victory!'],
      incorrect: ['Vanish and retry!'],
    },
    skill: {
      id: 'greninjaShuriken',
      name: 'Water Shuriken',
      type: 'passive',
      description: '🗡️ Earn +8 speed coins on solves under 8 seconds.',
      params: { bonus: 8 }
    }
  }
];

export const STARTER_POKEMON = POKEMON_CATALOG.find(p => p.id === 'togepi');

export const getPokemonById = (idOrName) => {
  if (!idOrName) return STARTER_POKEMON;
  if (typeof idOrName === 'object') {
    if (idOrName.pokedexNumber && idOrName.spriteUrl) return idOrName;
    if (idOrName.id) idOrName = idOrName.id;
    else if (idOrName.toName) idOrName = idOrName.toName;
    else if (idOrName.fromName) idOrName = idOrName.fromName;
    else if (idOrName.name) idOrName = idOrName.name;
  }
  const searchStr = String(idOrName).toLowerCase().trim();
  return POKEMON_CATALOG.find(p => 
    p.id.toLowerCase() === searchStr || 
    p.name.toLowerCase() === searchStr || 
    String(p.pokedexNumber) === searchStr
  ) || STARTER_POKEMON;
};
export const getPokemonByRarity = (rarity) => POKEMON_CATALOG.filter(p => p.rarity === rarity);

/**
 * Roll a random Pokémon that the student doesn't own yet, weighted by rarity rates.
 * If boxType === 'legendary', it rolls exclusively Legendary (80%) or Epic (20%).
 */
export const rollMysteryBox = (ownedIds = [], boxType = 'standard') => {
  const allPokemon = POKEMON_CATALOG;
  const unowned = allPokemon.filter(p => !ownedIds.includes(p.id) && p.rarity !== 'starter');
  
  if (boxType === 'legendary') {
    // Legendary Mystery Box (1000 Coins) - GUARANTEED LEGENDARY / EPIC!
    const legendaryPool = unowned.filter(p => p.rarity === 'legendary');
    const epicPool = unowned.filter(p => p.rarity === 'epic');

    let pool = legendaryPool;
    const rand = Math.random();
    if (rand < 0.80 && legendaryPool.length > 0) {
      pool = legendaryPool;
    } else if (epicPool.length > 0) {
      pool = epicPool;
    } else {
      pool = allPokemon.filter(p => (p.rarity === 'legendary' || p.rarity === 'epic'));
    }

    if (pool.length === 0) pool = allPokemon.filter(p => p.rarity !== 'starter');
    return pool[Math.floor(Math.random() * pool.length)].id;
  }

  if (unowned.length === 0) {
    const eligibleForDuplicate = allPokemon.filter(p => p.rarity !== 'starter');
    if (eligibleForDuplicate.length === 0) return null;
    return eligibleForDuplicate[Math.floor(Math.random() * eligibleForDuplicate.length)].id;
  }

  const rand = Math.random();
  let targetRarity = 'rare';
  
  if (rand < MYSTERY_BOX_RATES.legendary) {
    targetRarity = 'legendary';
  } else if (rand < MYSTERY_BOX_RATES.legendary + MYSTERY_BOX_RATES.epic) {
    targetRarity = 'epic';
  } else {
    targetRarity = 'rare';
  }

  let candidates = unowned.filter(p => p.rarity === targetRarity);
  
  if (candidates.length === 0) {
    candidates = unowned.filter(p => p.rarity === 'epic');
  }
  if (candidates.length === 0) {
    candidates = unowned.filter(p => p.rarity === 'rare');
  }
  if (candidates.length === 0) {
    candidates = unowned.filter(p => p.rarity === 'legendary');
  }
  if (candidates.length === 0) {
    candidates = unowned;
  }

  if (candidates.length === 0) return null;
  const selected = candidates[Math.floor(Math.random() * candidates.length)];
  return selected.id;
};

/**
 * Fallback CDN URL generator for Pokemon sprites.
 * If raw.githubusercontent.com fails or is blocked, this returns jsDelivr CDN link.
 */
export const getPokemonFallbackSprite = (pokeOrId) => {
  const poke = getPokemonById(pokeOrId);
  const num = poke?.pokedexNumber || 175;
  const padded = String(num).padStart(3, '0');
  return `https://assets.pokemon.com/assets/cms2/img/pokedex/full/${padded}.png`;
};

export const handlePokemonImageError = (e, pokeOrId) => {
  const target = e.currentTarget || e.target;
  if (!target) return;
  const poke = getPokemonById(pokeOrId);
  const num = poke?.pokedexNumber || 175;
  const padded = String(num).padStart(3, '0');
  const pokeName = poke?.name || 'Pokemon';
  const slug = pokeName.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (!target.dataset.triedFallback1) {
    target.dataset.triedFallback1 = 'true';
    target.src = `https://assets.pokemon.com/assets/cms2/img/pokedex/full/${padded}.png`;
  } else if (!target.dataset.triedFallback2) {
    target.dataset.triedFallback2 = 'true';
    target.src = `https://play.pokemonshowdown.com/sprites/gen5/${slug}.png`;
  } else if (!target.dataset.triedFallback3) {
    target.dataset.triedFallback3 = 'true';
    target.src = `https://img.pokemondb.net/sprites/home/normal/${slug}.png`;
  } else if (!target.dataset.triedFallback4) {
    target.dataset.triedFallback4 = 'true';
    target.src = `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${num}.png`;
  } else if (!target.dataset.triedFallback5) {
    target.dataset.triedFallback5 = 'true';
    const initial = pokeName.charAt(0).toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="%238b5cf6" stroke="%23ffffff" stroke-width="4"/><text x="50" y="62" font-size="42" font-weight="bold" text-anchor="middle" fill="white">${initial}</text></svg>`;
    target.src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
};
