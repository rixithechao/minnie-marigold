# minnie-marigold
A magician-themed Discord.js chatbot for memes and polls and stuff, primarily used and actively developed in the codehaus server.


--- LICENSE ---
The character of Minnie Marigold is copyright 2018-present by Michael "Rockythechao" Charnecki.  The Minnie Marigold chatbot software is copyright 2018-present by Rockythechao, Wohlstand, and SetaYoshi.

Software licensed under the Apache License, Version 2.0 (the "License");  you may not use these files except in compliance with the License.  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the License for the specific language governing permissions and limitations under the License.


--- TO-DO (IN ROUGH ORDER OF PRIORITY) ---
- add luna's old lunalua documentation search feature

- replace the "/minnie magic" phrases with some kinda fun, randomized command

- fix shutdown command so it doesn't error in the command window (and ideally posts a goodbye message)

- finalize and finish implementing reaction poll system & commands & stuff
    - polls stored as objects in serverdata
    - poll host can specify whether crowdsourced (anyone can submit an option)
    - hosting polls is authorized functionality but submitting a poll option is not
    - should allow for indefinite polls (run until manually ended), duration-based (run for WW:XX:YY:ZZ), and deadline-based (run until XXXX/YY/ZZ)
    - results announced in separate post when the poll ends
    - DM reaction menu for creating polls(?)

- move some hardcoded strings to their own phrase groups in commands.json to allow for more variety