# minnie-marigold
A magician-themed Discord chatbot for memes and polls and stuff, primarily used and actively developed in the codehaus server


--- TO-DO (IN ROUGH ORDER OF PRIORITY) ---

- fix shutdown command so it doesn't error in the command window (and ideally posts a goodbye message)

- properly integrate with wohl's server so we don't have the same trouble we did with setting up knux

- finish the authorization-related code and storage (at the moment it _should_ work for everyone in the owner list in config.json so just be sure to include our IDs in there)

- add luna's old lunalua documentation search feature

- replace the "/minnie magic" phrases with some kinda fun, randomized command

- more anime

- finalize and finish implementing reaction poll system & commands & stuff
    - polls stored as objects in serverdata
    - poll host can specify whether crowdsourced (anyone can submit an option)
    - hosting polls is authorized functionality but submitting a poll option is not
    - should allow for indefinite polls (run until manually ended), duration-based (run for WW:XX:YY:ZZ), and deadline-based (run until XXXX/YY/ZZ)
    - results announced in separate post when the poll ends
    - DM reaction menu for creating polls(?)

- move some hardcoded strings to their own phrase groups in commands.json to allow for more variety

- even more anime