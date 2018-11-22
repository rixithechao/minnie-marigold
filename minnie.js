var Discord = require("discord.js");
var client = new Discord.Client();
const fs = require("fs");
var exec = require("child_process").execFile;


// ==== Auth URL ====
//https://discordapp.com/oauth2/authorize?client_id={Put%20your%20ID%20here}&scope=bot&permissions=67169280

// Important config vars
var mconfig = JSON.parse(fs.readFileSync("config.json", "utf8"));

var ownerIds          = mconfig.ownerIds;
var loginId           = mconfig.loginId;
var modRoleId         = mconfig.modRoleId;
var startingChannelId = mconfig.startingChannel;
var authorizeData     = mconfig.authIds;

if  (authorizeData == null)
{
	authorizeData = {};
}


// Other stuff
var commands    = JSON.parse(fs.readFileSync("commands.json", "utf8"));
delete commands._example;

//var responses   = JSON.parse(fs.readFileSync("responses.json", "utf8"));
var keywords    = JSON.parse(fs.readFileSync("keywords.json", "utf8"));
var userdata    = JSON.parse(fs.readFileSync("userdata.json", "utf8"));
var serverdata  = JSON.parse(fs.readFileSync("serverdata.json", "utf8"));

var prevAuthor = null;

var lastAndTime = -5000;
var andCount = Math.floor((Math.random() * 3) + 3);

var canPostInGeneral = false;
var channelsAllowed = {[mconfig.startingChannel]:true}; 
var deleteAll = false;

var ttsActive = false;

var sayUser = new Array(0);
var sayMember = new Array(0);
var sayMessage = new Array(0);



// Set up regexp stuff
var keywordRegex = {_thing:true}
updateRegex()


function getArrayRandom(array)
{
	if  (array == null)
	{
		//console.log ("Cannot get a random element from a null array")
		return {index:null, value:null}
	}
	else
	{
		var id = Math.floor(Math.random() * (array.length));
		//console.log("position: "+id.toString())
		var val = array[id];
		return {index:id, value:val}
	}
}



function updateJson(data, name)
{
	console.log("UPDATING JSON: " + name);
	fs.writeFileSync(name + ".json", JSON.stringify(data));
	//localStorage.setItem(name, JSON.stringify(data));
}

function updateServerData(guild)
{
	console.log("UPDATING SERVER DATA: " + guild.name);
	if (serverdata[guild.id] == null)
	{
		serverdata[guild.id] = {};
	}
	var guildEntry = serverdata[guild.id];

	// Basic data
	guildEntry.name = guild.name;


	// Initialize different categories
	var categories = ["polls","channels","channelsAllowed"];
	for (var j in categories)
	{
		var val = categories[j];
		if (guildEntry[val] == null)
			guildEntry[val] = {};
	}

	// Channel data
	guild.channels.forEach(channel => {

		console.log("UPDATING SERVER'S CHANNEL DATA: " + channel.id.toString() + "(" + channel.name + ")");

		if (guildEntry.channels[channel.id] == null)
			guildEntry.channels[channel.id] = {};
		var channelEntry = guildEntry.channels[channel.id];

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
	})

	updateJson(serverdata,'serverdata');
}

function updateUserData(user)
{
	if (user == null)
	{
		console.log("ATTEMPTED TO UPDATE USER DATA BUT INVALID USER GIVEN");
		return;
	}
	
	console.log("UPDATING USER DATA");// + user.username);
	if (userdata[user.id] == null)
	{
		userdata[user.id] = {};
	}
	var userEntry = userdata[user.id];

	userEntry.username = user.username;

	if (user.dmChannel != null  &&  user.dmChannel != undefined)
		userEntry.dmChannelId = user.dmChannel.id;

	updateJson(userdata,'userdata');
}



function updateRegex()
{
	for (var k in keywords)
	{
		keywordRegex[k] = new RegExp(keywords[k], 'img');
		//console.log ("Updated regex " + k + ": "+keywordRegex[k].toString())
	}
}



function sendMsg(args) //channel, msg, waitRange, extraPause, sequenceLevel)
{
	if (args.sequenceLevel == null)
		args.sequenceLevel = 0

	var firstOfSequence = false
	var currentMsg = args.msg
	var nextMsg = ""
	if  (currentMsg.includes("<page>"))
	{
		currentMsg = args.msg.substring(0,args.msg.indexOf('<page>'))
		nextMsg = args.msg.substring(args.msg.indexOf('<page>')+6)
		midSequence = true
		if  (args.sequenceLevel == 0)
			firstOfSequence = true
	}

	if (args.waitRange == null)
		args.waitRange = 1

	if (args.extraPause == null)
		args.extraPause = 0

	var totalTypingTime = args.msg.length*(Math.random()*args.waitRange)*15 + args.extraPause

	setTimeout(function()
	{
		setTimeout(function()
		{
			args.midSequence = false
			if  (/*!quietMode  &&  */(!args.midSequence  ||  args.sequenceLevel > 0  ||  firstOfSequence))
			{
				console.log("SENDING MESSAGE: " + currentMsg);
				args.channel.send(currentMsg, {split:true /*tts:(ttsActive==true)*/})
				if (nextMsg != "")
				{
					sendMsg ({channel: args.channel, msg: nextMsg, waitRange: 0.5, extraPause: 500, sequenceLevel: args.sequenceLevel+1})
					midSequence = true
				}
			}
		},300)
	},totalTypingTime)

	return totalTypingTime + 300
}


function keywordPost (channel, keyword, category)
{
	var postText = getPhraseRandom (keyword, category)
	sendMsg({channel: channel, msg: postText})
}


function getPhraseRandom (keyword, category)
{
	if (category == null)
		category = "all"

	if  (commands[keyword] != null)
	{
		if  (commands[keyword].phrases == null)
			keyword = "occasional"

		if  (commands[keyword].phrases[category] == null)
			category = "all"

		console.log("Getting random phrase: keyword=" + keyword + ", category=" + category);

		var postText = getArrayRandom (commands[keyword].phrases[category]).value

		var newPostText = postText.replace(/<phrase [^\s]+>/gi, function (x)
		{
			var replText = getPhraseRandom(x.slice(8, -1))
			console.log("Replacement made: "+replText)
			return replText
		})

		return newPostText
	}
	else
		return "UNABLE TO GET POST FOR KEYWORD: " + keyword + ", CATEGORY: " + category
}


function getArrayRandom(array)
{
	if  (array == null)
		return {index:null, value:null}
	else
	{
		var id = Math.floor(Math.random() * (array.length));
		var val = array[id];
		return {index:id, value:val}
	}
}




// ---------- NEW COMMAND SYSTEM FUNCTIONS ----------------

var helpCategories = {}

function buildHelpCategories ()
{
	console.log("START CREATING COMMAND LISTS FOR HELP");
	helpCategories = {}
	for (var item in commands)
	{
		var cmdProps = commands[item]
		if (cmdProps != null)
		{
			if  (cmdProps.category != null)
			{
				if  (helpCategories[cmdProps.category] == null)
				{
					helpCategories[cmdProps.category] = []
					console.log("ADDING CATEGORY " + cmdProps.category);
				}

				helpCategories[cmdProps.category].push(item)
				console.log("ADDING COMMAND " + item + " TO CATEGORY " + cmdProps.category);
			}
		}
		else
			console.log("UNABLE TO GET PROPERTIES FOR " + item);
	}
	console.log("DONE CREATING COMMAND LISTS");
}


var cmdFuncts = {}
cmdFuncts.sendResponse = function (msg, cmdStr, argStr, props)
{
	keywordPost (msg.channel, cmdStr, argStr);
}

cmdFuncts.toggleTTS = function (msg, cmdStr, argStr, props)
{
	if  (ttsActive == false)
	{
		ttsActive = true;
		sendMsg({channel:msg.channel, msg:"[Text to speech enabled]"});
	}
	else
	{
		ttsActive = false;
		sendMsg({channel:msg.channel, msg:"[Text to speech disabled]"});
	}
}

/*
cmdFuncts.gitPull = function (msg, cmdStr, argStr, props)
{
	console.log("Pulling a git");
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
	var setStr = argStr;
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
			var myChannel = client.channels.find('name', setStr);
			if  (myChannel != null)
				keywordPost (msg.channel, "enter");
		}
	}
	client.user.setStatus("invisible")
	msg.channel.send(getArrayRandom(props.phrases).value, {tts:(ttsActive==true)})
	console.log("Shutting down");

	client.setTimeout(function(){
			process.exit(1);
		}, 1000);
}
*/


var lastReactClearedId = serverdata.lastReactClearedId

function clearReactionsInMessage(msg,id)
{
	msg.channel.fetchMessage(id)
		.then(message => message.clearReactions());
}


cmdFuncts.quote = function (msg, cmdStr, argStr, props)
{
	msg.channel.fetchMessage(argStr)
		.then(message => sendMsg ({"channel":msg.channel, "msg":"[" + argStr + ": " + message.cleanContent+"]"}));
}
 
cmdFuncts.clearReactsOne = function (msg, cmdStr, argStr, props)
{
	msg.channel.fetchMessage(argStr)
		.then(message => message.clearReactions());
}

cmdFuncts.shutDown = function (msg, cmdStr, argStr, props)
{
	client.user.setStatus("invisible")
	msg.channel.send(getArrayRandom(props.phrases).value, {tts:(ttsActive==true)})
	console.log("Shutting down");

	client.setTimeout(function(){
			client.destroy();
		}, 10000);
}


var cleanupTrigger = "🇶"
var cleanupEmojis = new Array(0)

cmdFuncts.setCleanupTrigger = function (msg, cmdStr, argStr, props)
{
	var cleanupTrigger = argStr;
	sendMsg({channel:msg.channel, msg:"[Authorized users may now add " + cleanupTrigger + " to a message to remove all of that message's reactions.]"});

}


function clearReactsUpTo (msg,argList)
{
	var msgId = argList[0]
	argList.shift()
	var debugString = "EMOJI NAME LIST: "

	for (i = 0;  i < argList.length;  i++)
	{
		argList[i] = argList[i].replace(/\/:/g, "");
		debugString += argList[i] + ","
	}

	debugString += "; " + argList.length.toString() + " total"
	console.log(debugString);

	var messageCounter = 0
	var matchedMessageCount = 0
	var matchedReactionsCount = 0

	msg.channel.fetchMessages({before:msgId, limit:100})
		.then((messages) => {
			var messageArr = messages.array()
			for (i=0; i < messageArr.length; i++)
			{
				var message = messageArr[i];
				console.log ("MESSAGE: "+message.content)
				messageCounter++;
				var matchCounter = 0
				var reactionArray = message.reactions.array();
				for (i2=0; i2<reactionArray.length; i2++)
				{
					var reaction = reactionArray[i2]
					console.log("REACTION FOUND: name=" + reaction.emoji.name + ", tostring=" + reaction.emoji.toString());
					if  (argList.includes(reaction.emoji.name))
					{
						console.log("REACTION MATCH");
						matchCounter++;
						matchedReactionsCount++;
					}
				}
				if  (matchCounter == argList.length)
				{
					console.log("ALL MATCHED");
					message.clearReactions();
					lastReactClearedId = message.id
					if  (i%10 == 0  ||  i == messageArr.length-1)
					{
						serverdata.lastReactClearedId = lastReactClearedId
						updateJson(serverdata,'serverdata')
					}
					matchedMessageCount++
				}
			}
			sendMsg({channel:msg.channel, msg:"[" + messageCounter.toString() + " messages scanned, " + matchedMessageCount.toString() + " were flagged as matches, " + matchedReactionsCount.toString() + " total reaction matches.]"});

		})
		.catch(err => {
			console.error(err);
		});
}


cmdFuncts.cleanupReactions = function (msg, cmdStr, argStr, props)
{
	var argList = argStr.split(" ");
	var mainArg = argList[0];
	argList.shift();

	switch (mainArg)
	{
		case "idlist":
			for (i=0;  i < argList.length;  i++)
			{
				var id = argList[i];
				console.log("ATTEMPTING TO CLEAR MESSAGE "+id)
				clearReactionsInMessage(msg,id);
			}
			break;

		case "upto":
			clearReactsUpTo(msg,argList)
			break;

		case "resume":
			argList.unshift(serverdata.lastReactClearedId)
			clearReactsUpTo(msg,argList)
			break;
	}

}


cmdFuncts.updateAndRestart = function (msg, cmdStr, argStr, props)
{
	console.log("Pulling a git");
	exec('git', ["pull", "origin", "master"], function(err, data)
	{
		if(err == null)
		{
			sendMsg({channel:msg.channel, msg:"git pull origin master\n```\n" + data.toString() + "\n```\n"});

			client.user.setStatus("invisible")
			keywordPost (msg.channel, "exit");
			console.log("Shutting down");

			client.setTimeout(function() {process.exit(1);}, 1000);
		}
		else
		{
			sendMsg({channel:msg.channel, msg:"ERROR of git pull origin master```\n" + err + "\n\n" + data.toString() + "\n```\n"});
			exec('git', ["merge", "--abort"], function(err, data){});
		}
	});
}


cmdFuncts.reactionSpam = function (msg, cmdStr, argStr, props)
{
	var numReacts = 3+Math.floor(Math.random()*5)
	for (i = 0; i < numReacts; i++)
	{
		var emoteStr = "";
		var emoteCategory = "threat";
		if (Math.random() > 0.5)
			emoteCategory = "brag";

		console.log ("emote category: "+emoteCategory)
		reactFromArray(msg, emoteReacts[emoteCategory]);
	}
}

cmdFuncts.setGame = function (msg, cmdStr, argStr, props)
{
	client.user.setActivity(argStr);
}

cmdFuncts.revealSay = function (msg, cmdStr, argStr, props)
{
	if  (sayMember.length > 0)
	{
		var authorUser = sayUser[0];
		var authorMember = sayMember[0];
		var authorStr = authorUser.username + " (" + getPhraseRandom("aka") + authorMember.displayName + ")";
		var contentStr = sayMessage[0];
		sendMsg({channel:msg.channel, msg:"That "+getPhraseRandom("thatRascal")+" "+authorStr+" made me say:```\n"+contentStr+"```"});
	}
	else
		sendMsg({channel:msg.channel, msg:"Sorry, nobody's put any words in my mouth since I last logged in!"});
}

cmdFuncts.forceSay = function (msg, cmdStr, argStr, props)
{
	// Get substring to say
	var setStr = argStr

	// Replace phrase tags with the corresponding phrase
	setStr = setStr.replace(/\^[^\^]*\^/gi, function myFunction(x){
			var noCarrots = x.substring(1,x.length-1);
			return getPhraseRandom (noCarrots);
		});

	sayMember.splice(0, 0, msg.member);
	sayUser.splice(0, 0, msg.member.user);
	sayMessage.splice(0, 0, setStr);
	msg.delete(0);

	console.log("FORCESAY: " + msg.channel.id.toString() + ", " + setStr);
	sendMsg({channel:msg.channel, msg:setStr})
}

cmdFuncts.toggleChannel = function (msg, cmdStr, argStr, props)
{
	var setStr = argStr;
	var myChannel = client.channels.find('name', setStr);
	if  (myChannel != null)
	{
		if  (channelsAllowed[setStr] == true)
		{
			//keywordPost (msg.channel, "disableChannel");
			sendMsg({channel:msg.channel, msg:"Sure thing, I can stop posting in #"+setStr+"!"});
			channelsAllowed[setStr] = false;
		}
		else
		{
			//keywordPost (msg.channel, "enableChannel");
			sendMsg({channel:msg.channel, msg:"Huh?  you want to see me in #"+setStr+"?  Okay!"});
			channelsAllowed[setStr] = true;
			keywordPost (myChannel, "enter");
		}
		updateJson(serverdata,'serverdata');
	}
	else
	{
		console.log("Attempting to toggle posting in nonexistent channel.");
		sendMsg({channel:msg.channel, msg:"What?  I don't see that channel...  Are you sure you spelled it correctly?"});
		//keywordPost (msg.channel, "cantFindChannel");
	}
}

cmdFuncts.toggleDelCmd = function (msg, cmdStr, argStr, props)
{
	if  (deleteAll == false)
	{
		deleteAll = true;
		sendMsg({channel:msg.channel, msg:"Gotcha, I'll clean up those command calls for you!"})
	}
	else
	{
		deleteAll = false;
	sendMsg({channel:msg.channel, msg:"Want your command calls left untouched?  Fine by me!"})
	}
}


cmdFuncts.forceError = function (msg, cmdStr, argStr, props)
{
	sendMsg(beep, boop)
}

cmdFuncts.setAvatar = function (msg, cmdStr, argStr, props)
{
	var newAvatar = getArrayRandom(props.phrases).value;
	client.user.setAvatar(newAvatar);
	sendMsg({channel:msg.channel, msg:"`[Avatar changed to `<"+newAvatar+">`]`"});
}

cmdFuncts.callHelp = function (msg, cmdStr, argStr, props)
{

	var newEmbed = {"color": 16757780, "fields": []}
	var sendHelp = false

	// Show a specific command's help post
	if  (argStr != "")
	{
		var newProps = commands[argStr]
		var deny = true

		if  (newProps != null)
		{
			var authStr = newProps.auth
			if  (authStr == null)
				authStr = "everyone"

			if  (newProps.info != null)
			{
				newEmbed["fields"] = [{
				                       name: "Command info: "+argStr,
				                       value: "\nAuthorization group: "+authStr+"\n"+newProps.info
				                      }]
				sendHelp = true
				deny = false
			}
		}

		if  (deny)
			cmdFuncts.sendResponse(msg, "nocmd", "", commands["nocmd"])
	}

	// Show the general help post
	else
	{
		newEmbed["fields"] = [{
		                      name: "Minniebot help",
		                      value: "To perform a command, prefix it with `/minnie ` (for example, `/minnie quote`)\n\nTo get info on a command, prefix it with `/minnie help ` (type just `/minnie help` to display this post.)\n\nCrossed-out commands are currently broken."
		                     }]

		for (var item in helpCategories)
		{
			var listStr = ""
			for (var item2 in helpCategories[item])
			{
				if (listStr != "")
					listStr = listStr + ", "

				var cmdStr = helpCategories[item][item2]
				var functName = commands[cmdStr]["function"]
				if  (functName == null)
					functName = "sendResponse"

				if  (cmdFuncts[functName] == null)
					listStr = listStr + "~~`" + cmdStr + "`~~"
				else
					listStr = listStr + "`" + cmdStr + "`"
			}
			newEmbed["fields"].push({name: item+" commands:", value: listStr})
			sendHelp = true
		}
	}

	if (sendHelp)
		msg.channel.send({embed: newEmbed});
}

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

client.on("messageReactionAdd", (reactionRef, userRef) => {
	if  (userRef !== client.user)
	{
		// Get guild member of the person who reacted
		var gMembers = reactionRef.message.guild.members
		var member
		var message = reactionRef.message
		for (var m in gMembers)
		{
			var mUser = m.user
			if  (mUser == userRef)
			{
				member = m
				break;
			}
		}

		// Check for authorization
		var authorized = ((ownerIds.indexOf(userRef.id) != -1) || member.roles.has(modRoleId))
		var authordata = userdata[userRef.id]
		if  (authordata != null)
		{
			if  (authordata["authorized"] == true)
				authorized = true
		}

		var usernameStr = userRef.username
		if (authorized)
			usernameStr = "AUTHORIZED USER "+userRef.username

		console.log ("REACTION ADDED BY "+usernameStr+": "+reactionRef.emoji.toString()+", "+reactionRef.emoji.id+", "+reactionRef.emoji.identifier+", "+reactionRef.emoji.name)
		console.log (" ")

		if (reactionRef.emoji.toString() == cleanupTrigger)
		{
			console.log ("Matches cleanup trigger")
			if (authorized)
			{
				console.log ("Cleanup triggered by authorized user")
				// Start comparing emojis
				/*
				var message = reactionRef.message
				var matchCounter = 0
				for (var reaction in message.reactions)
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
				message.clearReactions();
				//message.reactions.deleteAll();
			}
		}
	}
});


client.on("message", msg => {

	try {
		// Don't process own messages the same way as others'
		if  (msg.author !== client.user)
		{

			// Log the message
			console.log("------------------------");
			if  (msg.member != null)
				console.log(msg.member.displayName+" said: "+msg.cleanContent);
			else
				console.log("[unknown] said: "+msg.cleanContent);

			// Authority check
			var authorized = ((ownerIds.indexOf(msg.author.id) != -1) || msg.member.roles.has(modRoleId))
			var authordata = userdata[msg.author.id]
			if  (authordata != null)
			{
				if  (authordata["authorized"] == true)
					authorized = true
				else
					console.log("Message's author has no authorization info specified in their userdata!");

			}
			else
				console.log("Message's author has no authorization info specified in their userdata!");


			// Direct commands
			if (msg.cleanContent.startsWith("/minnie "))
			{
				console.log("COMMAND DETECTED");

				var cleanMsg = msg.cleanContent
				var inputStr = cleanMsg.substr (8)

				var cmdStr   = inputStr
				var argStr   = ""
				if (inputStr.indexOf(' ') != -1)
				{
					cmdStr = inputStr.substr (0, inputStr.indexOf(' '))
					argStr = inputStr.substr (inputStr.indexOf(' ')+1)
				}
				console.log("INPUT: " + inputStr + ", COMMAND: " + cmdStr + ", ARGS: " + argStr);

				if (commands[cmdStr] != null)
				{
					var props = commands[cmdStr]
					var authLevel = props["auth"]
					var matchesAuthLevel = true
					var functPtr = cmdFuncts["sendResponse"]
					var functStr = ""

					updateUserData(msg.author);


					if  (authLevel != null)
					{
						console.log("AUTHORIZATION NEEDED: " + authLevel);
						matchesAuthLevel = false
						var authTable = authorizeData[authLevel]
						if (authTable == null)
							authTable = ownerIds

						if (authTable.indexOf(msg.author.id) != -1)
							matchesAuthLevel = true
					}
					else
						authLevel = "none"

					if  (props["function"] != null)
					{
						functStr = props["function"]
						functPtr = cmdFuncts[functStr]
					}

					console.log("Authorized by userdata: " + authorized.toString() + ";  Authorized by named group: " + matchesAuthLevel.toString());
					if  (matchesAuthLevel  ||  authorized)
					{
						if  (props.needsArgs != null  &&  (argStr == ""  ||  argStr == null))
						{
							console.log("Arguments not provided for a command that needs them");
							keywordPost (msg.channel, "noArgs")
						}
						else if  (functPtr != null)
						{
							console.log("Successful command call");
							functPtr(msg, cmdStr, argStr, props)
						}
						else if (functStr != "")
							//keywordPost (channel, keyword, category)
							sendMsg({channel:msg.channel, msg:"[Command is broken.  Function not found: " + functStr + "]"})
					}
					else
					{
						console.log("Unauthorized command attempted!");
						cmdFuncts.sendResponse(msg, "decline", "", commands["decline"]);
					}
				}
				else
				{
					console.log("commands["+cmdStr+"] == null!");
					cmdFuncts.sendResponse(msg, "decline", "", commands["decline"]);
				}


				if  (deleteAll == true  &&  msg != null)
					msg.delete(0);
			}


			// Indirect interactions
			else
			{
				// Don't respond to messages outside of permitted channels
				if (channelsAllowed[msg.channel.name] != true) return;

				// Parse message
				var aboutMe = false;
				var messageStr = msg.cleanContent.toLowerCase();
				var words = msg.cleanContent.toLowerCase().split(" ");
				var detectedTypes = {}

				// Remove every /knux from the string
				messageStr = messageStr.replace(/\/minnie/g, "");

				// Count matches
				for (var k in keywords)
				{
					detectedTypes[k] = 0;

					var matches = messageStr.match(keywordRegex[k])
					if  (matches != null)
					{
						detectedTypes[k] = matches.length;
						console.log ("Matched category "+k+": "+detectedTypes[k].toString())
					}
				}

				// Special handling
				if (msg.cleanContent.endsWith("?"))
					detectedTypes.about += 1;
				if (msg.cleanContent.endsWith("!"))
				{
					if  (detectedTypes.threat > detectedTypes.brag)
						detectedTypes.threat += 1;
					else
						detectedTypes.brag += 1;
				}

				// Get highest values
				var highestNum = 1;
				var highestTied = new Array(0);
				var highestRandString = ""
				var logString = "Top sentiments: "
				for (var k in detectedTypes)
				{
					var val = detectedTypes[k];
					if (val > highestNum) highestNum = val;
				}
				for (var k in detectedTypes)
				{
					var val = detectedTypes[k];
					if (val == highestNum  &&  k != "indirect"  &&  k != "bot")
					{
						highestTied.push(k);
						logString = logString + k + ",";
					}
				}
				console.log(logString);


				// Choose random category from the ones that tied
				if (highestTied.length > 0)
					highestRandString = highestTied[Math.floor(Math.random() * (highestTied.length))];
				else
					highestRandString = "brag";


				// Check if the message is directed at or about the bot
				aboutMe = (msg.isMentioned(client.user) == true  ||  detectedTypes.bot > 0  ||  (prevAuthor == client.user && detectedTypes.indirect > 0));

				// If at or about the bot...
				if (aboutMe)
				{
					console.log("I think I'll respond to this message.");

					// Initialize sentiment analysis vars
					var tone = "neutral";  // neutral, insult, challenge, question, praise, request

					// Either reply with an emoji reaction or response message

					if (Math.random() > 0.5  &&  emoteReacts[highestRandString] != null)
					{
						var emoteCategory = emoteReacts[highestRandString];
						console.log ("emote category: "+highestRandString)
						reactFromArray(msg, emoteCategory);
					}
					else
						keywordPost (msg.channel, highestRandString);
				}


				// If not about or directed at the bot
				else
				{
					// React to precious keyword with gem
					if (Math.random() > 0.8  &&  highestRandString != "threat"  &&  emoteReacts[highestRandString] != null)
					{
						var emoteCategory = emoteReacts[highestRandString];
						console.log("emote category: " + highestRandString);
						reactFromArray(msg, emoteCategory);
					}

					// Occasionally respond with "& Knuckles" anyway
					andCount -= 1;
					console.log("And count: " + andCount.toString());
					if  (andCount <= 0)
					{
						var timeSinceLastAnd = client.uptime - lastAndTime;
						if  (timeSinceLastAnd > 1000*20)
						{
							lastAndTime = client.uptime
							sendMsg({channel:msg.channel, msg:"& Knuckles"});
							andCount = Math.floor((Math.random() * 35) + 15);
						}
						else
							console.log("Time since last and: " + timeSinceLastAnd.toString());
					}
				}
			}
			console.log(" ");
		}
		prevAuthor = msg.author;

	}
	catch(err) {
		keywordPost(msg.channel, "error");
		msg.channel.send("```"+err+"```");
		console.log(err);
	}
});

client.on('ready', () => {


	client.user.setStatus("online")
	client.user.setActivity("with the arcane energies that govern our world!");
	var myChannel = client.channels.find('id', startingChannelId);
	updateServerData(myChannel.guild);

	if (serverdata[myChannel.guild.id].channelsAllowed != null)
		channelsAllowed = serverdata[myChannel.guild.id].channelsAllowed;

	var introString = getPhraseRandom("enter");
	if  (introString != null  &&  myChannel != null)
		myChannel.send(introString);
		//myChannelB.send(introString);

	buildHelpCategories ();

	console.log('READY; '+introString);
	console.log(' ');
});



client.login(loginId);

