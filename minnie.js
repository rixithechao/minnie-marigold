/*
The character of Minnie Marigold is copyright 2018-present by Michael "Rockythechao" Charnecki.  The Minnie Marigold chatbot software is copyright 2018-present by Rockythechao, Wohlstand, and SetaYoshi.

Licensed under the Apache License, Version 2.0 (the "License");  you may not use this file except in compliance with the License.  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the License for the specific language governing permissions and limitations under the License.
*/

let Discord = require("discord.js");
let client = new Discord.Client();
const fs = require("fs");
let exec = require("child_process").execFile;

// WatchDog for SystemD
let notify = null;
if (process.platform === 'linux')
    notify = require('sd-notify');

// ==== Auth URL ====
//https://discordapp.com/oauth2/authorize?client_id={Put%20your%20ID%20here}&scope=bot&permissions=67169280

// Important config vars
let mconfig = JSON.parse(fs.readFileSync("config.json", "utf8"));

let ownerIds            = mconfig.ownerIds;
let loginId             = mconfig.loginId;
let modRoleId           = mconfig.modRoleId;
let startingChannelId   = mconfig.startingChannel;
let startingGuildId     = mconfig.startingGuild;
let authorizeData       = mconfig.authIds;

if (authorizeData == null)
    authorizeData = {};


let emoteReacts = {
    default: ["✊"],
    threat: ["somedork:231283304958001154", "gravytea:232183775549849600", "thonkang:273610959094808576", "suspicious:231273731132096513", "😡", "😠", "🔥", "😏", "👎", "☠", "⚔"],
    brag: ["🍒", "😎", "🍆", "👍", "🥇", "👌", "🤘"],
    precious: ["💎", "💰", "💲", "💵"]
};

// Other stuff
let basecommands = JSON.parse(fs.readFileSync("commands.json", "utf8"));
delete basecommands._example;
let commands = basecommands;
if(fs.existsSync("servercommands.json"))
{
	let servercommands = JSON.parse(fs.readFileSync("servercommands.json", "utf8"));
	commands = {...basecommands, ...servercommands};
}

//let responses   = JSON.parse(fs.readFileSync("responses.json", "utf8"));
let basekeywords = JSON.parse(fs.readFileSync("keywords.json", "utf8"));
let keywords = basekeywords;
/*
if(fs.existsSync("serverkeywords.json"))
{
	let serverkeywords = JSON.parse(fs.readFileSync("serverkeywords.json", "utf8"));
	keywords = {...basekeywords, ...serverkeywords};
}
*/

if(!fs.existsSync("userdata.json"))
    fs.writeFileSync("userdata.json", "{}", "utf8");
let userdata = JSON.parse(fs.readFileSync("userdata.json", "utf8"));

if(!fs.existsSync("serverdata.json"))
    fs.writeFileSync("serverdata.json", "{}", "utf8");
let serverdata = JSON.parse(fs.readFileSync("serverdata.json", "utf8"));

let prevAuthor = null;

let lastAndTime = -5000;
// let andCount = Math.floor((Math.random() * 3) + 3);

let channelsAllowed = {[mconfig.startingChannel] : true};
let deleteAll = false;

let ttsActive = false;

let sayUser = new Array(0);
let sayMember = new Array(0);
let sayMessage = new Array(0);

let logBackup = new Array(0);


// Set up regexp stuff
let keywordRegex = {_thing: true};
updateRegex();


// Set up new custom logging function so we can view the logs in DM if necessary
function consoleLog(loggedText)
{
    console.log(loggedText);
    logBackup.splice(0, 0, loggedText);
}

function isChannelAllowed(channel)
{
    let chId = channel.id.toString();
    if(chId in channelsAllowed)
        return channelsAllowed[chId] === true;
    else
        return false;
}

function setChannelAllowed(channel, isAllowed)
{
    let chId = channel.id.toString();
    channelsAllowed[chId] = isAllowed;
    serverdata.channelsAllowed = channelsAllowed;
}

function getChannelByName(guild, channelName)
{
    return guild.channels.find("name", channelName);
}

let msgFailedAttempts = 0;
function msgSendError(error, message)
{
    if (error)
    {
        consoleLog("Fail to send message: " + message);
        let ErrorText = "Can't send message because: " + error;
        consoleLog(ErrorText);
        if (++msgFailedAttempts > 2)
        {
            consoleLog("Trying to relogin...");
            client.login(loginId).catch(msgSendError);
            msgFailedAttempts = 0;
        }
    }
    else
    {
        msgFailedAttempts = 0;
    }
}

function getRandomInt(min, max)
{
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleArray (array) {
    let i = 0, j = 0, temp = null;

    for (i = array.length - 1; i > 0; i -= 1) {
        j = Math.floor(Math.random() * (i + 1));
        temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

function getArrayRandom(array)
{
    if (array == null)
        return {index: null, value: null};
    else
    {
        let id = getRandomInt(0, array.length -1);
        let val = array[id];
        return {index: id, value: val};
    }
}

function reactFromArray(message, array)
{
    if (array == null)
    {
        array = emoteReacts.default;
        //consoleLog("No valid array provided, attempting to use default emote array")
    }
    //consoleLog("Array values: "+array.toString())

    let emote = getArrayRandom(array).value;
    if (emote != null)
    {
        //consoleLog("Attempting to react with "+emote.toString())
        message.react(emote);

        /*
        if  (emote.startsWith(":"))
            message.react(emote);
        else
            message.react(message.guild.emojis.get(emote));
        */

    }
    else
        consoleLog("Couldn't get a valid emoji string");
}

function updateJson(data, name)
{
    consoleLog("UPDATING JSON: " + name);
    fs.writeFileSync(name + ".json", JSON.stringify(data));
    //localStorage.setItem(name, JSON.stringify(data));
}

function updateServerData(guild)
{
    consoleLog("UPDATING SERVER DATA: " + guild.name);
    if (serverdata[guild.id] == null)
        serverdata[guild.id] = {};

    let guildEntry = serverdata[guild.id];

    // Basic data
    guildEntry.name = guild.name;


    // Initialize different categories
    let categories = ["polls", "channels", "channelsAllowed"];
    for (let j in categories)
    {
        let val = categories[j];
        if (guildEntry[val] == null)
            guildEntry[val] = {};
    }

    // Channel data
    guild.channels.forEach(channel =>
    {
        if (channel != null && channel.type == "text")
        {
            consoleLog("UPDATING SERVER'S CHANNEL DATA: " + channel.id.toString() + "(" + channel.name + ")");

            if (guildEntry.channels[channel.id] == null)
                guildEntry.channels[channel.id] = {};
            let channelEntry = guildEntry.channels[channel.id];

            channelEntry.name = channel.name;
            channelEntry.type = channel.type;

            /*
            switch (channel.type)
            {
                case "text":
                    break;
                case "voice":
                    break;
        }
            */

        }
        else
            consoleLog("UNABLE TO PROCESS CHANNEL");
    });
    consoleLog("DONE UPDATING SERVER'S CHANNEL DATA");

    updateJson(serverdata, 'serverdata');
}

function updateUserData(user)
{
    if (user == null)
    {
        consoleLog("ATTEMPTED TO UPDATE USER DATA BUT INVALID USER GIVEN");
        return;
    }

    consoleLog("UPDATING USER DATA");// + user.username);
    if (userdata[user.id] == null)
        userdata[user.id] = {};

    let userEntry = userdata[user.id];

    userEntry.username = user.username;

    if (user.dmChannel)
        userEntry.dmChannelId = user.dmChannel.id;

    updateJson(userdata, 'userdata');
}


function updateRegex()
{
    for (let k in keywords)
    {
        keywordRegex[k] = new RegExp(keywords[k], 'img');
        //consoleLog ("Updated regex " + k + ": "+keywordRegex[k].toString())
    }
}


function sendMsg(args) //channel, msg, waitRange, extraPause, sequenceLevel, userToMention, mustSend)
{
    if (args.sequenceLevel == null)
        args.sequenceLevel = 0;

    let firstOfSequence = false;
    let currentMsg = "";

    if  (args.isCodeBlock === true)
        currentMsg = "```\n";
    currentMsg += args.msg;

    let nextMsg = "";
    if (currentMsg.includes("<page>"))
    {
        currentMsg = args.msg.substring(0, args.msg.indexOf('<page>'));
        nextMsg = args.msg.substring(args.msg.indexOf('<page>') + 6);
        midSequence = true;
        if (args.sequenceLevel === 0)
            firstOfSequence = true;
    }
    if (currentMsg.includes("<mention>"))
    {
        currentMsg = currentMsg.replace(/<mention>/gi, (args.userToMention != null) ? "@" + userToMention.username + "#" + userToMention.discriminator + " " : "@NOBODY IN PARTICULAR");
    }
    if (currentMsg.includes("<servername>"))
    {
        currentMsg = currentMsg.replace(/<servername>/gi, (msg.guild != nil) ? msg.guild.name : "our DMs");
    }

    if (args.isCodeBlock === true)
    {
        currentMsg += "\n```";
    }

    if (args.waitRange == null)
        args.waitRange = 1;

    if (args.extraPause == null)
        args.extraPause = 0;

    let totalTypingTime = Math.min(args.msg.length, 200) * (Math.random() * args.waitRange) * 15 + args.extraPause;

    setTimeout(function ()
    {
        setTimeout(function ()
        {
            args.midSequence = false;
            if (/*!quietMode  &&  */(!args.midSequence || args.sequenceLevel > 0 || firstOfSequence))
            {
                consoleLog("SENDING MESSAGE: " + currentMsg);
                args.channel.send(currentMsg, {split: true /*tts:(ttsActive==true)*/}).catch(msgSendError);
                if (nextMsg !== "")
                {
                    sendMsg({
                        channel: args.channel,
                        msg: nextMsg,
                        waitRange: 0.5,
                        extraPause: 500,
                        sequenceLevel: args.sequenceLevel + 1,
                        isCodeBlock: args.isCodeBlock
                    });
                    midSequence = true
                }
            }
        }, 300)
    }, totalTypingTime);

    return totalTypingTime + 300
}


let phraseSetsShuffled = {}
function keywordPost(channel, keyword, category, user)
{
    phraseSetsShuffled = {}
    let postText = getPhraseRandom(keyword, category, (commands[keyword].noRepeats != null));
    sendMsg({channel: channel, msg: postText, userToMention: user})
}


function getPhraseRandom(keyword, category, shuffle)
{
    if (category == null)
        category = "all";
    if (shuffle == null)
        shuffle = false;

    if (commands[keyword] != null)
    {
        if (commands[keyword].phrases == null)
            keyword = "occasional";

        if (commands[keyword].phrases[category] == null)
            category = "all";

        consoleLog("Getting random phrase: keyword=" + keyword + ", category=" + category);


        // Get the randomized phrase
        let postText = ""
        let phraseArray = commands[keyword].phrases[category];

        // New option for randomization to prevent repeats: shuffle the array, then step through it index by index
        if (shuffle == true)
        {
            if (phraseSetsShuffled[keyword] = null)
                phraseSetsShuffled[keyword] = {};

            let selectedIndex = phraseSetsShuffled[keyword][category];
            if (selectedIndex == null  ||  selectedIndex == phraseArray.length-1)
            {
                phraseSetsShuffled[keyword][category] = 0;
                selectedIndex = 0;
                shuffleArray(phraseArray);
            }
            else
            {
                phraseSetsShuffled[keyword][category] += 1;
            }

            postText = phraseArray[selectedIndex];
        }
        // Otherwise select it with getArrayRandom as usual
        else
            postText = getArrayRandom(phraseArray).value;


        // <phrase> tag substitutions
        let newPostText = postText.replace(/<phrase [^\s]+>/gi, function (x)
        {
            let replText = getPhraseRandom(x.slice(8, -1), null, (commands[keyword].noRepeats != null));
            consoleLog("Replacement made: " + replText);
            return replText
        });

        return newPostText
    }
    else
        return "UNABLE TO GET POST FOR KEYWORD: " + keyword + ", CATEGORY: " + category
}


// ---------- NEW COMMAND SYSTEM FUNCTIONS ----------------

let helpCategories = {};

function buildHelpCategories()
{
    consoleLog("START CREATING COMMAND LISTS FOR HELP");
    helpCategories = {};
    for (let item in commands)
    {
        let cmdProps = commands[item];
        if (cmdProps != null)
        {
            if (cmdProps.category != null)
            {
                if (helpCategories[cmdProps.category] == null)
                {
                    helpCategories[cmdProps.category] = [];
                    consoleLog("ADDING CATEGORY " + cmdProps.category);
                }

                helpCategories[cmdProps.category].push(item);
                consoleLog("ADDING COMMAND " + item + " TO CATEGORY " + cmdProps.category);
            }
        }
        else
            consoleLog("UNABLE TO GET PROPERTIES FOR " + item);
    }
    consoleLog("DONE CREATING COMMAND LISTS");
}


let cmdFuncts = {};
cmdFuncts.sendResponse = function (msg, cmdStr, argStr, props)
{
    keywordPost(msg.channel, cmdStr, argStr, msg.member.user);
};

cmdFuncts.toggleTTS = function (msg, cmdStr, argStr, props)
{
    if (ttsActive === false)
    {
        ttsActive = true;
        sendMsg({channel: msg.channel, msg: "[Text to speech enabled]"});
    }
    else
    {
        ttsActive = false;
        sendMsg({channel: msg.channel, msg: "[Text to speech disabled]"});
    }
};

/*
cmdFuncts.gitPull = function (msg, cmdStr, argStr, props)
{
    consoleLog("Pulling a git");
    exec('git', ["pull", "origin", "master"], function(err, data)
    {
        if(err == null)
            sendMsg(msg.channel, "git pull origin master\n```\n" + data.toString() + "\n```\n");
        else
        {
            sendMsg(msg.channel, "ERROR of git pull origin master```\n" + err + "\n\n" + data.toString() + "\n```\n");
            exec('git', ["merge", "--abort"], function(err, data){});
        }
    });
}
*/

/*
cmdFuncts.emojiCommands = function (msg, cmdStr, argStr, props)
{
    let setStr = argStr;
    if  (setStr == "beep-boop")
        keywordPost (msg.channel, "decline");
    else
    {
        if  (channelsAllowed[setStr] == true)
        {
            sendMsg(msg.channel, "[Posting in #"+setStr+" disabled]");
            channelsAllowed[setStr] = false;
        }
        else
        {
            sendMsg(msg.channel, "[Posting in #"+setStr+" enabled]");
            channelsAllowed[setStr] = true;
            let myChannel = client.channels.find('name', setStr);
            if  (myChannel != null)
                keywordPost (msg.channel, "enter");
        }
    }
    client.user.setStatus("invisible")
    msg.channel.send(getArrayRandom(props.phrases).value, {tts:(ttsActive==true)})
    consoleLog("Shutting down");

    client.setTimeout(function(){
            process.exit(1);
        }, 1000);
}
*/


let lastReactClearedId = serverdata.lastReactClearedId;

function clearReactionsInMessage(msg, id)
{
    msg.channel.fetchMessage(id)
        .then(message => message.clearReactions());
}





/*
function initializePoll (channel)
{
	if (guildEntry[val])
}



cmdFuncts.startPoll = function (msg, cmdStr, argStr, props)
{
	
}
*/




cmdFuncts.quote = function (msg, cmdStr, argStr, props)
{
    msg.channel.fetchMessage(argStr)
        .then(message => sendMsg({"channel": msg.channel, "msg": "[" + argStr + ": " + message.cleanContent + "]"}));
};

cmdFuncts.clearReactsOne = function (msg, cmdStr, argStr, props)
{
    msg.channel.fetchMessage(argStr)
        .then(message => message.clearReactions());
};

cmdFuncts.shutDown = function (msg, cmdStr, argStr, props)
{
    client.user.setStatus("invisible")
        .catch(msgSendError);

    let k = getPhraseRandom("shutdown");
    if(k)
    {
        msg.channel.send(k.value, {
            tts: (ttsActive === true)
        }).catch(msgSendError);
    }
    consoleLog("Shutting down");

    client.setTimeout(function ()
    {
        client.destroy().catch(msgSendError);
        setTimeout(function ()
        {
            process.exit();
        }, 2000);
    }, 3000);
};


cmdFuncts.getJson = function (msg, cmdStr, argStr, props)
{
	msg.member.user.send("Attempting to send the data...");
	msg.member.user.send("Here you go!", { files: ["serverdata.png","userdata.png"] });
}




cmdFuncts.welcomeMessage = function (channel, user)
{
    sendMsg({channel: channel, msg: getPhraseRandom("welcome"), userToMention: user});
};



let cleanupTrigger = "🇶";
let cleanupEmojis = new Array(0);

cmdFuncts.setCleanupTrigger = function (msg, cmdStr, argStr, props)
{
    let cleanupTrigger = argStr;
    sendMsg({
        channel: msg.channel,
        msg: "[Authorized users may now add " + cleanupTrigger + " to a message to remove all of that message's reactions.]"
    });
};


function clearReactsUpTo(msg, argList)
{
    let msgId = argList[0];
    argList.shift();
    let debugString = "EMOJI NAME LIST: ";

    for (i = 0; i < argList.length; i++)
    {
        argList[i] = argList[i].replace(/\/:/g, "");
        debugString += argList[i] + ","
    }

    debugString += "; " + argList.length.toString() + " total";
    consoleLog(debugString);

    let messageCounter = 0;
    let matchedMessageCount = 0;
    let matchedReactionsCount = 0;

    msg.channel.fetchMessages({before: msgId, limit: 100})
        .then((messages) =>
        {
            let messageArr = messages.array();
            for (i = 0; i < messageArr.length; i++)
            {
                let message = messageArr[i];
                consoleLog("MESSAGE: " + message.content);
                messageCounter++;
                let matchCounter = 0;
                let reactionArray = message.reactions.array();
                for (i2 = 0; i2 < reactionArray.length; i2++)
                {
                    let reaction = reactionArray[i2];
                    consoleLog("REACTION FOUND: name=" + reaction.emoji.name + ", tostring=" + reaction.emoji.toString());
                    if (argList.includes(reaction.emoji.name))
                    {
                        consoleLog("REACTION MATCH");
                        matchCounter++;
                        matchedReactionsCount++;
                    }
                }
                if (matchCounter === argList.length)
                {
                    consoleLog("ALL MATCHED");
                    message.clearReactions().catch(msgSendError);
                    lastReactClearedId = message.id;
                    if (i % 10 === 0 || i === messageArr.length - 1)
                    {
                        serverdata.lastReactClearedId = lastReactClearedId;
                        updateJson(serverdata, 'serverdata')
                    }
                    matchedMessageCount++
                }
            }
            sendMsg({
                channel: msg.channel,
                msg: "[" + messageCounter.toString() + " messages scanned, " + matchedMessageCount.toString() + " were flagged as matches, " + matchedReactionsCount.toString() + " total reaction matches.]"
            });

        })
        .catch(err =>
        {
            console.error(err);
        });
}


cmdFuncts.cleanupReactions = function (msg, cmdStr, argStr, props)
{
    let argList = argStr.split(" ");
    let mainArg = argList[0];
    argList.shift();

    switch (mainArg)
    {
        case "idlist":
            for (i = 0; i < argList.length; i++)
            {
                let id = argList[i];
                consoleLog("ATTEMPTING TO CLEAR MESSAGE " + id);
                clearReactionsInMessage(msg, id);
            }
            break;

        case "upto":
            clearReactsUpTo(msg, argList);
            break;

        case "resume":
            argList.unshift(serverdata.lastReactClearedId);
            clearReactsUpTo(msg, argList);
            break;
    }

};


cmdFuncts.updateAndRestart = function (msg, cmdStr, argStr, props)
{
    consoleLog("Pulling a git");
    exec('git', ["pull", "origin", "master"], function (err, data)
    {
        if (err == null)
        {
            sendMsg({channel: msg.channel, msg: "git pull origin master\n```\n" + data.toString() + "\n```\n"});

            client.user.setStatus("invisible").catch(msgSendError);
            keywordPost(msg.channel, "exit");
            consoleLog("Shutting down");

            client.setTimeout(function ()
            {
                process.exit(1);
            }, 1000);
        }
        else
        {
            sendMsg({
                channel: msg.channel,
                msg: "ERROR of git pull origin master```\n" + err + "\n\n" + data.toString() + "\n```\n"
            });
            exec('git', ["merge", "--abort"], function (err, data)
            {
            });
        }
    });
};


cmdFuncts.reactionSpam = function (msg, cmdStr, argStr, props)
{
    let numReacts = 3 + Math.floor(Math.random() * 5);
    for (i = 0; i < numReacts; i++)
    {
        let emoteStr = "";
        let emoteCategory = "threat";
        if (Math.random() > 0.5)
            emoteCategory = "brag";

        consoleLog("emote category: " + emoteCategory);
        reactFromArray(msg, emoteReacts[emoteCategory]);
    }
};

cmdFuncts.setGame = function (msg, cmdStr, argStr, props)
{
    client.user.setActivity(argStr).catch(msgSendError);
};

cmdFuncts.postLogs = function (msg, cmdStr, argStr, props)
{
    let lineCount = 10;
    if  (argStr !== "")
        lineCount = Number(argStr);

    if (logBackup.length > 0)
    {
        let comboString = "";
        for (let i = 0;  i < Math.min(logBackup.length,lineCount);  i++)
        {
            comboString += "\n" + logBackup[i]
        }

        sendMsg({
            channel: msg.channel,
            msg: comboString,
            isCodeBlock: true
        });
    }
    else
        sendMsg({channel: msg.channel, msg: "Oh my, it doesn't look like anything was logged!  That's probably not good..."});
}

cmdFuncts.revealSay = function (msg, cmdStr, argStr, props)
{
    if (sayMember.length > 0)
    {
        let authorUser = sayUser[0];
        let authorMember = sayMember[0];
        let authorStr = authorUser.username + " (" + getPhraseRandom("aka") + authorMember.displayName + ")";
        let contentStr = sayMessage[0];
        sendMsg({
            channel: msg.channel,
            msg: "That " + getPhraseRandom("thatRascal") + " " + authorStr + " made me say:```\n" + contentStr + "```"
        });
    }
    else
        sendMsg({channel: msg.channel, msg: "Sorry, nobody's put any words in my mouth since I last logged in!"});
};

cmdFuncts.forceSay = function (msg, cmdStr, argStr, props)
{
    // Get substring to say
    let setStr = argStr;

    // Replace phrase tags with the corresponding phrase
    setStr = setStr.replace(/\^[^\^]*\^/gi, function myFunction(x)
    {
        let noCarrots = x.substring(1, x.length - 1);
        return getPhraseRandom(noCarrots);
    });

    sayMember.splice(0, 0, msg.member);
    sayUser.splice(0, 0, msg.member.user);
    sayMessage.splice(0, 0, setStr);
    msg.delete(0);

    consoleLog("FORCESAY: " + msg.channel.id.toString() + ", " + setStr);
    sendMsg({channel: msg.channel, msg: setStr})
};

cmdFuncts.toggleChannel = function (msg, cmdStr, argStr, props)
{
    let setStr = argStr;
    let chan = getChannelByName(msg.guild, setStr);
    if (chan)
    {
        if (isChannelAllowed(chan))
        {
            //keywordPost (msg.channel, "disableChannel");
            sendMsg({channel: msg.channel, msg: "Sure thing, I can stop posting in #" + setStr + "!"});
            setChannelAllowed(chan, false);
        }
        else
        {
            //keywordPost (msg.channel, "enableChannel");
            sendMsg({channel: msg.channel, msg: "Huh?  you want to see me in #" + setStr + "?  Okay!"});
            setChannelAllowed(chan, true);
            keywordPost(chan, "enter");
        }
        updateJson(serverdata, 'serverdata');
    }
    else
    {
        consoleLog("Attempting to toggle posting in nonexistent channel.");
        sendMsg({
            channel: msg.channel,
            msg: "What?  I don't see that channel...  Are you sure you spelled it correctly?"
        });
        //keywordPost (msg.channel, "cantFindChannel");
    }
};

cmdFuncts.toggleDelCmd = function (msg, cmdStr, argStr, props)
{
    if (deleteAll === false)
    {
        deleteAll = true;
        sendMsg({channel: msg.channel, msg: "Gotcha, I'll clean up those command calls for you!"})
    }
    else
    {
        deleteAll = false;
        sendMsg({channel: msg.channel, msg: "Want your command calls left untouched?  Fine by me!"})
    }
};


cmdFuncts.forceError = function (msg, cmdStr, argStr, props)
{
    sendMsg(beep, boop)
};

cmdFuncts.setAvatar = function (msg, cmdStr, argStr, props)
{
    let newAvatar = getArrayRandom(props.phrases).value;
    client.user.setAvatar(newAvatar).catch(msgSendError);
    sendMsg({channel: msg.channel, msg: "`[Avatar changed to `<" + newAvatar + ">`]`"});
};

cmdFuncts.callHelp = function (msg, cmdStr, argStr, props)
{

    let newEmbed = {"color": 16757780, "fields": []};
    let sendHelp = false;

    // Show a specific command's help post
    if (argStr !== "")
    {
        let newProps = commands[argStr];
        let deny = true;

        if (newProps != null)
        {
            
            let authStr = newProps.auth;
            if (authStr == null)
                authStr = "everyone";

            if (newProps.info != null)
            {
                newEmbed["fields"] = [{
                    name: "Command info: " + argStr,
                    value: "\nAuthorization group: " + authStr + "\n" + newProps.info
                }];
                sendHelp = true;
                deny = false
            }
        }

        if (deny)
            cmdFuncts.sendResponse(msg, "nocmd", "", commands["nocmd"])
    }

    // Show the general help post
    else
    {
        newEmbed["fields"] = [{
            name: "Minniebot help",
            value: "To perform a command, prefix it with `/minnie ` (for example, `/minnie quote`)\n\nTo get info on a command, prefix it with `/minnie help ` (type just `/minnie help` to display this post.)\n\nCrossed-out commands are either broken or not implemented yet."
        }];

        for (let item in helpCategories)
        {
            let listStr = "";
            for (let item2 in helpCategories[item])
            {
                if (listStr !== "")
                    listStr = listStr + ", ";

                let cmdStr = helpCategories[item][item2];
                let functName = commands[cmdStr]["function"];
                if (functName == null)
                    functName = "sendResponse";

                if (cmdFuncts[functName] == null)
                    listStr = listStr + "~~`" + cmdStr + "`~~";
                else
                    listStr = listStr + "`" + cmdStr + "`"
            }
            newEmbed["fields"].push({name: item + " commands:", value: listStr});
            sendHelp = true
        }
    }

    if (sendHelp)
        msg.channel.send({embed: newEmbed});
};

/*
client.on("raw", async event => {
    if (event.t !== 'MESSAGE_REACTION_ADD') return;

    const { d: data } = event;
    const channel = client.channels.get(data.channel_id);

    if (channel.messages.has(data.message_id)) return;

    const user = client.users.get(data.user_id);
    const message = await channel.fetchMessage(data.message_id);

    const emojiKey = (data.emoji.id) ? `${data.emoji.name}:${data.emoji.id}` : data.emoji.name;
    const reaction = message.reactions.get(emojiKey);

    client.emit('messageReactionAdd', reaction, user);
});
*/

client.on("messageReactionAdd", (reactionRef, userRef) =>
{
    if (userRef !== client.user)
    {
        // Get guild member of the person who reacted
        let gMembers = reactionRef.message.guild.members;
        let member;
        let message = reactionRef.message;
        for (let m in gMembers)
        {
            let mUser = m.user;
            if (mUser === userRef)
            {
                member = m;
                break;
            }
        }

        // Check for authorization
        let authorized = ((ownerIds.indexOf(userRef.id) !== -1) || (member && member.roles.has(modRoleId)));
        let authordata = userdata[userRef.id];
        if (authordata != null)
        {
            if (authordata["authorized"] === true)
                authorized = true
        }

        let usernameStr = userRef.username;
        if (authorized)
            usernameStr = "AUTHORIZED USER " + userRef.username;

        consoleLog("REACTION ADDED BY " + usernameStr + ": " + reactionRef.emoji.toString() + ", " +
            reactionRef.emoji.id + ", " + reactionRef.emoji.identifier + ", " + reactionRef.emoji.name);
        consoleLog(" ");

        if (reactionRef.emoji.toString() === cleanupTrigger)
        {
            consoleLog("Matches cleanup trigger");
            if (authorized)
            {
                consoleLog("Cleanup triggered by authorized user");
                // Start comparing emojis
                /*
                let message = reactionRef.message
                let matchCounter = 0
                for (let reaction in message.reactions)
                {
                    if  (cleanupEmojis.includes(reaction.emoji.name))
                    {
                        matchCounter++;
                    }
                }
                if  (matchCounter == cleanupEmojis.length)
                {
                    message.reactions.deleteAll();
                }
                */
                message.clearReactions().catch(msgSendError);
                //message.reactions.deleteAll();
            }
        }
    }
});


/**********************************************
*  ON MESSAGE                                 *
**********************************************/
client.on("message", msg =>
{

    try
    {
        // Don't process own messages the same way as others'
        if (msg.author !== client.user && !msg.webhookID)
        {
            // Log the message
            consoleLog("------------------------");
            if (!msg.member)
                {
                    if (msg.member.displayName != null)
                        consoleLog(msg.member.displayName + " said: " + msg.cleanContent);
                    else
                        consoleLog(msg.member.user.username + " said: " + msg.cleanContent);
                }
            else
                consoleLog("[unknown] said: " + msg.cleanContent);

            // Authority check
            let authorized = ((ownerIds.indexOf(msg.author.id) !== -1) || (msg.member && msg.member.roles.has(modRoleId)));
            let authordata = userdata[msg.author.id];
            if (authordata != null)
            {
                if (authordata["authorized"] === true)
                    authorized = true;
                else
                    consoleLog("Message's author has no authorization info specified in their userdata!");

            }
            else
                consoleLog("Message's author has no authorization info specified in their userdata!");


            // Direct commands
            if (msg.content.startsWith("/minnie "))
            {
                consoleLog("COMMAND DETECTED");

                let inputMsg = msg.content;
                let cleanMsg = msg.cleanContent;
                let inputStr = inputMsg.substr(8);
                let inputStrClean = cleanMsg.substr(8);

                let cmdStr = inputStr;
                let argStr = "";
                let argStrClean = "";
                if (inputStr.indexOf(' ') !== -1)
                {
                    cmdStr = inputStr.substr(0, inputStr.indexOf(' '));
                    argStr = inputStr.substr(inputStr.indexOf(' ') + 1);
                    argStrClean = inputStrClean.substr(inputStrClean.indexOf(' ') + 1);
                }
                consoleLog("INPUT: " + inputStr + ", COMMAND: " + cmdStr + ", ARGS: " + argStr);

                if (commands[cmdStr] != null)
                {
                    let props = commands[cmdStr];
                    let authLevel = props["auth"];
                    let matchesAuthLevel = true;
                    let functPtr = cmdFuncts["sendResponse"];
                    let functStr = "";

                    updateUserData(msg.author);


                    if (authLevel != null)
                    {
                        consoleLog("AUTHORIZATION NEEDED: " + authLevel);
                        matchesAuthLevel = false;
                        let authTable = authorizeData[authLevel];
                        if (authTable == null)
                            authTable = ownerIds;

                        if (authTable.indexOf(msg.author.id) !== -1)
                            matchesAuthLevel = true
                    }
                    else
                        authLevel = "none";

                    let requireClean = false;
                    if (props["clean"] != null)
                    {
                        requireClean = props["clean"];
                    }

                    if (props["function"] != null)
                    {
                        functStr = props["function"];
                        functPtr = cmdFuncts[functStr]
                    }

                    consoleLog("Authorized by userdata: " + authorized.toString() + ";  Authorized by named group: " + matchesAuthLevel.toString());
                    if (matchesAuthLevel || authorized)
                    {
                        if (props.needsArgs != null && (argStr === "" || argStr == null))
                        {
                            consoleLog("Arguments not provided for a command that needs them");
                            keywordPost(msg.channel, "noArgs")
                        }
                        else if (functPtr != null)
                        {
                            consoleLog("Successful command call");
                            functPtr(msg, cmdStr, (requireClean ? argStrClean : argStr), props)
                        }
                        else if (functStr !== "")
                        //keywordPost (channel, keyword, category)
                            sendMsg({
                                channel: msg.channel,
                                msg: "[Command is broken.  Function not found: " + functStr + "]"
                            })
                    }
                    else
                    {
                        consoleLog("Unauthorized command attempted!");
                        cmdFuncts.sendResponse(msg, "decline", "", commands["decline"]);
                    }
                }
                else
                {
                    consoleLog("commands[" + cmdStr + "] == null!");
                    cmdFuncts.sendResponse(msg, "decline", "", commands["decline"]);
                }


                if (deleteAll === true && msg != null)
                    msg.delete(0);
            }


            // Indirect interactions
            else
            {
                // Don't respond to messages outside of permitted channels
                if (isChannelAllowed(msg.channel) !== true)
                    return;

                // Parse message
                let aboutMe = false;
                let messageStr = msg.content.toLowerCase();
                let words = msg.content.toLowerCase().split(" ");
                let detectedTypes = {};

                // Remove every /minnie from the string
                messageStr = messageStr.replace(/\/minnie/g, "");

                // Count matches
                for (let k in keywords)
                {
                    detectedTypes[k] = 0;

                    let matches = messageStr.match(keywordRegex[k]);
                    if (matches != null)
                    {
                        detectedTypes[k] = matches.length;
                        consoleLog("Matched category " + k + ": " + detectedTypes[k].toString() + "(" + matches.toString() + ")");
                    }
                }

                // Special handling
                if (msg.content.endsWith("?"))
                {
                    consoleLog("Question detected, +1 to type about: " + detectedTypes[k].toString() + " total");
                    detectedTypes.about += 1;
                }
                if (msg.content.endsWith("!"))
                {
                    if (detectedTypes.threat > detectedTypes.brag  &&  detectedTypes.threat > 0)
                    {
                        consoleLog("Ends with !, seems threatening so +1 to type threat: " + detectedTypes.threat.toString() + " total");
                        detectedTypes.threat += 1;
                    }
                    else
                    {
                        consoleLog("Ends with !, seems flattering so +1 to type brag: " + detectedTypes.brag.toString() + " total");
                        detectedTypes.brag += 1;
                    }
                }

                // Get highest values
                let highestNum = 1;
                let highestTied = new Array(0);
                let highestRandString = "";
                let logString = "Top sentiments: ";
                for (let k in detectedTypes)
                {
                    let val = detectedTypes[k];
                    if (val > highestNum) highestNum = val;
                }
                for (let k in detectedTypes)
                {
                    let val = detectedTypes[k];
                    if (val === highestNum && k !== "indirect" && k !== "bot")
                    {
                        highestTied.push(k);
                        logString += k + "(" + val.toString() + ")" + ",";
                    }
                }
                consoleLog(logString);


                // Choose random category from the ones that tied
                if (highestTied.length > 0)
                {
                    if (detectedTypes.threat > 0)
                        highestRandString = "threat";
                    else
                        highestRandString = highestTied[Math.floor(Math.random() * (highestTied.length))];
                }
                else
                    highestRandString = "brag";


                // Check if the message is directed at the bot
                aboutMe = (msg.isMentioned(client.user) === true);// || detectedTypes.bot > 0 || (prevAuthor === client.user && detectedTypes.indirect > 0));

                // If at or about the bot...
                if (aboutMe)
                {
                    consoleLog("I think I'll respond to this message.");

                    // Initialize sentiment analysis vars
                    let tone = "neutral";  // neutral, insult, challenge, question, praise, request

                    // Either reply with an emoji reaction or response message

                    //if (Math.random() > 0.5 && emoteReacts[highestRandString] != null)
                    //{
                        // ---- Do nothing for now ----

                        // let emoteCategory = emoteReacts[highestRandString];
                        // consoleLog("emote category: " + highestRandString);
                        // reactFromArray(msg, emoteCategory);
                    //}
                    //else
                        keywordPost(msg.channel, highestRandString);
                }


                // If not about or directed at the bot
                else
                {
                    // React to precious keyword with gem
                    if (Math.random() > 0.8 && highestRandString !== "threat" && emoteReacts[highestRandString] != null)
                    {
                        // ---- Do nothing for now ----
                        // let emoteCategory = emoteReacts[highestRandString];
                        // consoleLog("emote category: " + highestRandString);
                        // reactFromArray(msg, emoteCategory);
                    }

                    // Occasionally respond with "& Knuckles" anyway
                    /*
                    andCount -= 1;
                    consoleLog("And count: " + andCount.toString());
                    if (andCount <= 0)
                    {
                        let timeSinceLastAnd = client.uptime - lastAndTime;
                        if (timeSinceLastAnd > 1000 * 20)
                        {
                            lastAndTime = client.uptime;
                            sendMsg({channel: msg.channel, msg: "& Knuckles"});
                            andCount = Math.floor((Math.random() * 35) + 15);
                        }
                        else
                            consoleLog("Time since last and: " + timeSinceLastAnd.toString());
                    }
                    */
                }
            }
            consoleLog(" ");
        }
        prevAuthor = msg.author;

    } catch (err)
    {
        //dummying this stuff out for the time being so this bot isn't kicked out of codehaus

        //keywordPost(msg.channel, "error");
        //msg.channel.send("```" + err + "```");
        consoleLog(err);
    }
});


/**********************************************
*  ON WELCOME                                 *
**********************************************/
client.on("guildMemberAdd", member => {
	let channelGen = member.guild.defaultChannel;
	let channelBoop = client.channels.find('name', 'beep-boop');

	try
	{
		cmdFuncts.welcomeMessage (channelGen, member.user);
	}
	catch(err)
	{
		//channelGen.sendMessage("Oh, I tried to welcome a new member but something went wrong!");
		consoleLog(err);
	}
});


/**********************************************
*  ON START                                   *
**********************************************/
client.on('ready', () =>
{
    if (process.platform === 'linux')
    {
        notify.ready();
        const watchdogInterval = 2800;
        consoleLog('Initializing SystemD WatchDog with ' + watchdogInterval + ' millseconds internal ...');
        notify.startWatchdogMode(watchdogInterval);
    }

    client.user.setStatus("online").catch(msgSendError);
    client.user.setActivity("with the arcane energies that govern our world!").catch(msgSendError);
    let myGuild = client.guilds.get(startingGuildId);
    if(!myGuild)
    {
        let perms = 130112;
        let url = "https://discordapp.com/oauth2/authorize?client_id=" + client.user.id + "&scope=bot&permissions=" + perms;
        consoleLog("I'm not at the server!!! INVITE ME PLEASE!!! (Then, restart)\n" + url);
        return;
    }

    let myChannel = myGuild.channels.get(startingChannelId);
    if(!myChannel)
    {
        consoleLog("I don't know this channel! IT'S NONSENSE!");
        return;
    }

    let sDataCA = serverdata[myChannel.guild.id] ? serverdata[myChannel.guild.id].channelsAllowed : undefined;
    if (!sDataCA || (Object.keys(sDataCA).length === 0 && sDataCA.constructor === Object))
        channelsAllowed = {[startingChannelId]: true};
    else
        channelsAllowed = sDataCA;

    updateServerData(myChannel.guild);

    let introString = getPhraseRandom("enter");
    if (introString != null && myChannel != null)
        myChannel.send(introString);
    //myChannelB.send(introString);

    buildHelpCategories();

    consoleLog('READY; ' + introString);
    consoleLog(' ');
});


client.login(loginId).catch(msgSendError);

setInterval(function()
{
    if(global.gc)
    {
        global.gc();
    } else {
        consoleLog('Garbage collection unavailable.  Pass --expose-gc '
            + 'when launching node to enable forced garbage collection.');
    }
    consoleLog('Memory usage:', process.memoryUsage());
}, 1800000); //Every half of hour
