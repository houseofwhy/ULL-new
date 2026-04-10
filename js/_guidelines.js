export const guidelinesData = [
    {
        group: 'General',
        id: 'general',
        sections: [
            {
                id: 'introduction',
                title: 'Introduction',
                content: `
<p>These guidelines are directly adapted from, and heavily rely on, the structure and principles of the Global Demonlist Guidelines. We extend our full credit and gratitude to the original authors.</p>
<p>The following text contains information about the guidelines that explain how the Upcoming Level List (hereinafter referred to as \u201cthe list\u201d) works in terms of accepting records, managing levels, recognizing permitted and prohibited software, establishing the duties and areas of responsibility of the list staff.</p>
<p>These rules are subject to change, which will be announced in the list\u2019s discord server. Players should stay up to date with any changes to avoid unexpected problems.</p>
                `
            }
        ]
    },
    {
        group: 'Acceptance of Records',
        id: 'acceptance',
        intro: `
<p>This section of the guidelines contains information about the procedure for accepting records and everything related to them, including requirements for proof of legitimacy, tolerance and leniency policies, as well as the concept of cheating and the penalty system.</p>
<p>As a rule, the records that are first in queue are checked first, but there are exceptions, so if another player\u2019s later record was accepted earlier, it should not be assumed that your record was deleted or lost \u2014 it will be checked in order of queue.</p>
        `,
        sections: [
            {
                id: 'world-record',
                title: 'Definition of a World Record',
                content: `
<p>World records are categorized into two distinct types, each with specific criteria:</p>
<ul>
<li><strong>World Record (WR):</strong> The highest completion percentage achieved from 0% on the current version of the level (see \u201cVersion Relevance\u201d below).</li>
<li><strong>World Record Run (WR Run):</strong> The longest recorded segment (run) performed on the current version of the level. A \u201crun\u201d is defined as a segment from a starting percentage to the point of death or to 100% if completed. Length is measured by the difference between these percentages.</li>
</ul>
<h4>Version Relevance &amp; Record Validity</h4>
<p>The validity of a record is intrinsically tied to the relevant version of the level. The following rules apply:</p>
<ul>
<li><strong>Substantial Changes:</strong> If a level update introduces substantial changes that significantly increase its overall difficulty, all previous world records for that level are reset and considered obsolete.</li>
<li><strong>Minor Changes:</strong> For updates with minor alterations, several scenarios are possible:
<ul>
<li>If the level verifier changes without a significant increase in difficulty, the existing world record remains valid.</li>
<li>If the difficulty increases moderately, a new record (even with a lower length) may supersede the old one, at the moderators\u2019 discretion, based on the new context.</li>
<li>In the case of an open verification process for the level, only the higher percentage is considered for the record, without adjustments for difficulty differences between versions.</li>
</ul>
</li>
<li><strong>Levels in Development:</strong> If a level is in the decoration phase and does not have an updated gameplay layout, records set on the original layout are permitted. Once the gameplay is changed, only records on the new version are allowed.</li>
</ul>
                `
            },
            {
                id: 'proof-of-legitimacy',
                title: 'Requirements for proof of legitimacy',
                content: `
<p>Before submitting a record, you must familiarize yourself with the list of mandatory proof of legitimacy, as well as the requirements for it, to ensure that the record you are submitting complies with them, otherwise it will be immediately rejected, even before the verification stage:</p>
<ol>
<li><strong>A video recording</strong> of the record attempt that:
<ul>
<li>meets or exceeds the preferred minimum quality \u2013 at least 480p 50 FPS;</li>
<li>is posted on a public video hosting site accessible to people of all ages (YouTube, Twitch, BiliBili, RuTube, Medal, and similar sites), where access via a link is allowed;</li>
<li>does not violate the rules of the video hosting service itself, as well as the laws of the country in which it is based;</li>
<li>belongs to the account owner and is not satirical/humorous;</li>
<li>may contain editing elements (cuts, blurring, etc.) designed to conceal the player\u2019s personal information or various types of prohibited symbols; in this case, the player is obliged to upload the original recording with access via a link and attach it in the notes field (the unedited raw footage file is also accepted, see point 4), while the list staff do not have the right to disclose any information that the player has decided not to show;</li>
</ul>
</li>
<li><strong>The sound of clicks/taps</strong> that:
<ul>
<li>is clearly audible throughout the entire record attempt;</li>
<li>is recorded with a physical microphone (using Click Sounds and similar tools is considered proof tampering and may result in a ban!);</li>
<li>can be partially or completely cut from the video recording of the record attempt, in which case the player is obliged to upload the original recording at least with access via a link and attach it in the notes field (the unedited raw footage file is also accepted, see point 4);</li>
</ul>
</li>
<li>If the record was performed <strong>after July 5th, 2024</strong>, and any mod menu is used, be it Mega Hack, QOLMod, GDH, or another, <strong>display the cheat indicator</strong> (Indicate No Cheats) in the corner of the screen throughout the entire record attempt;</li>
</ol>
<p>It often happens that this evidence is insufficient for one reason or another, for example, in cases of suspected cheating, so there is a list of <strong>additional proof</strong>:</p>
<ol>
<li>Frames per second (FPS) counter in the corner of the screen (available in the Steam overlay, vanilla version of the game, or mod menu used by the player);</li>
<li>Clicks per second (CPS) counter in the corner of the screen (available in free mod menus);</li>
<li>Real-time display in the corner of the screen (available in free mod menus or when playing in windowed mode);</li>
<li>Show Hitboxes on Death (available in free mod menus);</li>
<li>A handcam (a webcam pointed at the player\u2019s hand, usually superimposed on the video where it does not cover any indicators);</li>
<li>Input Overlay (an overlay displaying button presses, usually superimposed on the video where it does not cover any indicators, available in OBS and other recording programs);</li>
<li>The <strong>unedited raw footage file</strong>, which:
<ul>
<li>contains two (or more) audio tracks \u2013 one with clicks/taps, another with system sounds, the order does not matter (this requirement does not apply to mobile devices due to the technical impossibility of such recording);</li>
<li>uploaded to a cloud storage (Google/Yandex Drive, MediaFire, but not YouTube or any other public video hosting!), with access open to anyone who has the link;</li>
<li>preferably lasts 3\u20137 minutes longer than the level; however, if the file is too large, the list staff can provide their own Google Drive account with an extended limit; just contact a list staff member.</li>
</ul>
</li>
<li>Stream with individual conditions set by the list staff member.</li>
</ol>
<p>The list staff have the right to request and/or require the provision of any of the above proof on an ongoing basis, if deemed necessary, so it is recommended to always be prepared for this. Refusal to provide additional proof usually results in the rejection of the record, and in rare cases, the player being banned for interfering with the operation of the website.</p>
                `
            },
            {
                id: 'tolerance-policy',
                title: 'Tolerance and leniency policy',
                content: `
<p>There are many different ways to record a record, third-party software for the game, and even some in-game conventions, but not all of them are recognized as acceptable for inclusion in the record list.</p>
<p>The following list provides a clear distinction between what is permitted and what is prohibited, and in order to avoid unexpected problems, players are strongly advised to read it carefully and ensure that the record being submitted has been set without the use of prohibited means.</p>

<h4>Section I. Acceptable recording options</h4>
<ol>
<li><strong>Classic screen recording</strong> using software (OBS, Bandicam, NVIDIA ShadowPlay, Radeon ReLive, and similar) is the recommended option and is accepted for any level in the list.
<ul>
<li>In this case, the unedited raw footage file is taken as the complete recording, from start to finish, as well as an instant replay \u2014 the main thing is that the entire record attempt must be recorded, with the exit to the main menu and at least 2\u20133 attempts before that (although this is not mandatory).</li>
<li>If the software used cannot save a file with more than one audio track and/or saves them only as a separate file (such as Radeon ReLive), then it will not be accepted as the unedited raw footage file \u2014 it is recommended to use other software that does not have this problem, such as OBS.</li>
</ul>
</li>
<li><strong>Liveplay</strong> (recording the screen on a third-party camera, acceptable if what is happening on the screen is clearly visible, including the necessary indicators) is a suitable option if the player has a low-performance device on which the recording level according to option 1 does not exceed 120 FPS.
<ul>
<li>The requirement for audio tracks in the unedited raw footage file does not apply to this option due to the technical impossibility of such recording.</li>
</ul>
</li>
<li>A <strong>stream recording</strong> may be accepted as a video recording of a record attempt (preferably with a timecode), but not as the unedited raw footage file \u2014 the player must save the file to the device\u2019s memory while streaming and then upload it to a cloud storage.</li>
</ol>

<h4>Section II. Third-party interference in the gameplay</h4>
<p>Any software that distorts the essence of the gameplay is <strong>prohibited</strong>. These include:</p>
<ul>
<li>GDBot in any form and any other reproduction of pre-recorded macros;</li>
<li>Noclip, No Spikes, Hitbox Multiplier, and any similar utility that changes the way of character\u2019s interaction with hitboxes (this also includes the use of the in-game Ignore Damage feature);</li>
<li>Speedhack, Game Guardian, Frame Stepper, and similar (which is equivalent to severe slowdown with Lock Delta or abuse of the Smooth Fix function);</li>
<li>Instant Complete, Jump Hack, and any other utility that affects game physics or physical constants (such as Speed or Gravity); However, for levels released/updated prior to 2.2, the distance between steps is not considered a constant, and therefore Physics Bypass in any form remains allowed for them (but is prohibited for 2.2 levels!); also, Click Between Frames does not fall under this rule, as its effect on physics applies only to single frames and cannot be consciously controlled by the player;</li>
<li>any manipulations intended to deliberately make the level easier, whether it be indirect changes made by the player (see point 4), replacing the level\u2019s music with music containing hints for completing the level, following another player in Globed, etc;</li>
<li>Release Dual-Trigger and similar technical settings for magnetic keyboards that make it easier to perform double clicks and spam sections.</li>
</ul>
<p>Software that makes any <strong>cosmetic changes</strong> should not simplify the game or affect the operation of gimmicks. Thus:</p>
<ul>
<li>Mini Cube Icon, No Portal Lightning, RGB Icons, Trail Always Off, High FPS Rotation Fix, and similar settings are <strong>allowed</strong>;</li>
<li>No Hide Trigger, No Mirror, No Camera Move/Zoom, Show Hitboxes, Show Layout, Show Trajectory, and similar settings are <strong>prohibited</strong> during record attempt;</li>
<li>abuse of Hide Pause Menu, Trail Always On, No Shaders, No Particles, Pause Countdown, Free Window Resize, and other mods to make levels easier is <strong>prohibited</strong>;</li>
<li>texture packs that change the level decoration, simplify the understanding of hitboxes, and/or make it difficult to read the necessary indicators, as well as third-party shaders that change the game\u2019s graphics during an attempt, are <strong>prohibited</strong>.</li>
</ul>
<p>Any software that does not create an unfair advantage and is intended only to increase the comfortability of the gameplay is <strong>allowed</strong>:</p>
<ul>
<li>anything that does not directly affect the record attempt: Show Hitboxes on Death, StartPos Switcher, Death Tracker, Quests in Pause, and similar;</li>
<li>anything that helps with practicing the level \u2014 whether it\u2019s Speedhack, Hitbox Multiplier, or something else \u2014 is allowed outside of record attempt;</li>
<li>anything that improves the player\u2019s technical interaction with the game without distorting the essence of the gameplay: RivaTuner, Timer Resolution, FPS Bypass (without restrictions), Zero Delay, Click Between Frames, and similar;</li>
<li>hotkey reassignment, but only as long as the number of original hotkeys matches the number of final hotkeys (for example, the number of jump keys must not exceed the original 4).</li>
</ul>
<p><strong>Changing the level by the player</strong> on their copy or on the original level using Level Edit (whether for bug fixes or enhancing Low Detail Mode) is allowed as long as it does not make the level significantly easier. The general provisions are as follows:</p>
<ul>
<li>removal of unnatural amplifiers of statistical significance of attempts is allowed (in particular, this includes any bug fixes for automatic parts of the level, removal of Click Between Frames mod blockers from levels, bug fixes for primitive gameplay elements such as balls sticking to the ceiling or slopes that have changed or become impassable in 2.2);</li>
<li>it is allowed to add speed modifiers to transitions and Song triggers to restore the synchronization of music with gameplay, if this does not affect gameplay in any way;</li>
<li>changing/darkening colors, removing pulses, and the like is allowed if there are accompanying health problems, whether it be color blindness, eye accommodation disorders, pathological photosensitivity, glaucoma, epilepsy, or other (should be agreed upon with the list staff);</li>
<li>strong Low Detail Mode is prohibited for memory levels (Super Probably Level, Requiem, and similar);</li>
<li>intentional level nerfing (by moving spikes, saws, entire structures, and more; this is equivalent to using software that distorts the essence of the gameplay!) is <strong>prohibited</strong>;</li>
<li>all other changes must be discussed with the list staff to avoid unexpected problems.</li>
</ul>

<h4>Section III. In-game conventions</h4>
<p>Currently, only records set on the <strong>current version of the game (2.2)</strong> are accepted. As for old records on older versions, they may be accepted if there is convincing evidence that the version used at the time the record was set was current (e.g., the date the video was uploaded).</p>
<p>Any features available in the vanilla version of the game, such as No Shake, Disable Gravity Effect, and others, are allowed for use, except when used for purposes other than their intended use. Thus, the use of Ignore Damage is prohibited if the player sets a record on their copy of the level (equivalent to using Noclip), and setting a record directly in the level editor is not considered equivalent to setting a record.</p>
<p>Records set using the following <strong>game vulnerabilities are not accepted</strong>:</p>
<ul>
<li>pause buffering (repeating the pause at a long distance to nerf spam sections and precise clicks);</li>
<li>deliberately slowing down the game using Smooth Fix (equivalent to using Speedhack);</li>
<li>abuse of changing the FPS value to manipulate frame/tick alignment, resulting in their specific location and thereby nerfing precise clicks.</li>
</ul>
<p>The following situations are <strong>considered equivalent to setting a record</strong>:</p>
<ul>
<li>Noclip Accuracy 100% and 0 deaths;</li>
<li>1st attempt in Practice Mode (without the Show Hitboxes function enabled, including the one built into the vanilla game);</li>
<li>playing in Death Link mode (Globed);</li>
<li>playing with StartPos at 0.00% (mainly applies to StartPos Switcher);</li>
<li>the player completing the entire gameplay and then exiting during the automatic part and/or before the end screen (however, the player must reach it if the cheat indicator is only displayed there);</li>
<li>prolonged/repeated pausing during an attempt (however, without abuse!);</li>
<li>but <strong>not</strong> playing in the editor! (see point 2).</li>
</ul>
<p>Any paths available in the current version of the level, whether they are color modes provided by the level creator or various strategies, skips, are allowed for use, except for those that bypass entire parts of the level.</p>
<p><strong>Changing (updating) the level by the creator</strong> entails:</p>
<ul>
<li>replacement of the level verifier if another player becomes the verifier, even if the new record is smaller;</li>
<li>a general prohibition on further completions of the old version of the level in any case;</li>
<li>rejection of all records if the level has become more difficult;</li>
<li>the possibility of reviewing records that were rejected due to changes to the level by the player that were deemed unacceptable but made by the creator in the new version (this is considered sufficient grounds for approving the same changes); to do this, you must submit a request to the list staff.</li>
</ul>
                `
            },
            {
                id: 'cheating-penalties',
                title: 'Cheating and penalties',
                content: `
<p>Cheating is understood to mean the abuse of software that distorts the essence of the game process (see above), as well as any act of tampering the proof of legitimacy, whether it be superimposing clicks/taps, cutting the footage, stealing someone else\u2019s video, or any other manipulation designed to pass off a hacked record as a legitimate one.</p>
<p>If a player is suspected of cheating, the list staff has the right to reject the record and request and/or require additional proof of legitimacy on an ongoing basis (see above). If the suspicion of cheating is confirmed or not disproven for some reason, a decision is made to punish the player.</p>
<p>The <strong>penalty system</strong> is as follows:</p>
<ul>
<li>If there is no direct evidence of cheating, the list staff do not have the right to ban the player \u2014 as a rule, the record is simply rejected. In particular, this includes cases where proof of the legitimacy of a previously accepted record has been lost for some reason (for example, it was deleted by the player themselves), which prevents it from being re-verified. Therefore, it is recommended to store such evidence in some way to avoid unexpected problems.</li>
<li>If the player cheated accidentally and can prove it to the list staff, the record is simply rejected without further restrictions.</li>
<li>If the player cheated intentionally, they will be banned from submitting records:
<ul>
<li>the first time for <strong>6 months</strong>;</li>
<li>the second time <strong>permanently</strong> (it is possible to have the ban lifted, but only in special cases).</li>
</ul>
</li>
<li>In addition, the player will also receive a <strong>\u201cFormer cheater\u201d badge</strong>, which will be permanently attached to their profile on the discord server and will continue to signal the violation.</li>
<li>If the player confesses to cheating, the term of the first ban is reduced to <strong>4 months</strong>. Thus, timely confession to cheating is welcomed and even encouraged, but the badge is still issued, and the term of the second ban remains permanent.</li>
<li>If a player has submitted his own record on behalf of a different person, whether to evade a ban, impersonate another person, or even for no particular reason, both of the accounts will be submission banned for <strong>6 months</strong>.</li>
<li>If two or more players share one account, each of them will be banned for <strong>6 months</strong>, and the shared account will receive a <strong>permanent</strong> submission ban.</li>
</ul>
<p>There are other grounds for banning a player: suspicious activity, unacceptable nickname (containing profanity, racist remarks, insults, threats, etc.), mass promotion of cheating, or interference with the website\u2019s operation (troll records, etc.) \u2014 such cases are investigated individually.</p>
                `
            }
        ]
    },
    {
        group: 'Level Placement',
        id: 'placement',
        intro: `
<p>This section of the guidelines covers the rules for adding levels to the list and determining their rank. It explains how levels are selected, positioned, and periodically reassessed.</p>
<p>Furthermore, it defines the distinction between the three core categories: \u201cAll Levels\u201d, the \u201cMain List\u201d, and the \u201cFuture List\u201d.</p>
        `,
        sections: [
            {
                id: 'list-structure',
                title: 'List Structure',
                content: `
<p>The Upcoming Level List is organized into three distinct tiers: All Levels, Main List, and Future List. While the relative positioning of levels is consistent across all tiers, each tier employs different inclusion standards, creating a hierarchy of probability and quality.</p>
<h4>All Levels</h4>
<p>This tier serves as the most comprehensive catalogue, featuring the largest number of levels and the lowest inclusion threshold. Its purpose is to list every level that has a conceivable chance of being verified and published, providing a broad overview of the upcoming landscape.</p>
<h4>Main List</h4>
<p>Serving a similar purpose as the \u201cAll Levels\u201d tier but with more stringent criteria, the Main List highlights levels that meet the fundamental standards required to be considered for an official rating by the developer (\u201cRate\u201d). It acts as a curated filter for higher-potential candidates.</p>
<h4>Future List</h4>
<p>This tier maintains the highest standards of the three. It functions as a focused preview, listing only levels with a very high likelihood of soon verification and publication. It represents the most immediate and probable future additions to the official demonlist.</p>
                `
            },
            {
                id: 'level-selection',
                title: 'Level Selection',
                content: `
<p>This section defines the standards that determine a level\u2019s eligibility for inclusion in the Upcoming Level List and its placement within specific tiers. Levels that pass the selection process are placed in the Pending List. There you can also find information about the approximate position of a particular level. It will be added to the list as soon as its exact position is determined.</p>

<h4>1. Universal Standards</h4>
<p>All levels, regardless of the target tier, must satisfy the following fundamental conditions:</p>
<ul>
<li>The level must be based on the Classic game type. There is currently no platformer list.</li>
<li>Levels are selected from those that are going to be published on the game\u2019s official servers. If a level is expected to be published on a private server, it will not be considered at all.</li>
<li>The level must have a public video recording available.</li>
<li>The level must demonstrate a credible potential to receive an official in-game rating. This is assessed through general criteria:
<ol>
<li>The level\u2019s duration is Medium or longer (\u226530 seconds);</li>
<li>The proposed version of the level is official (recognized by its original creator);</li>
<li>The level is in a valid state for consideration: it does not feature an open secret path to 100% and has not been officially released in another form;</li>
<li>The level is original \u2014 it does not contain stolen elements of decoration, gameplay, etc;</li>
<li>The level does not contain NSFW, NSFL, or similar elements, as well as profanity, racist remarks, insults, threats, which applies to both the content of the level and its name (in general, this corresponds to the age restriction of the game itself);</li>
<li>The level must be a deco project, with decoration either already in progress or definitively planned for its final state.</li>
</ol>
</li>
</ul>

<h4>2. Tier-Specific Standards</h4>
<p>Beyond the universal prerequisites, each tier enforces additional filters:</p>
<p><strong>All Levels Tier</strong></p>
<ul>
<li>The level must exhibit sufficient quality to pass a vote among designated evaluators. This subjective assessment considers overall composition, object use, concept and execution, use of colors, etc;</li>
<li>Levels on layout state are admitted only if the layout demonstrates notable quality or if the creator has a proven track record of completing projects.</li>
</ul>
<p><strong>Main List Tier</strong></p>
<ul>
<li>The level\u2019s quality bar (including the idea and its implementation, composition, use of colors, overall combination of objects, etc.) meets modern standards \u2014 it is comparable to the levels that were rated at the time of its release;</li>
<li>Layout-only levels are admitted only in cases of exceptionally high-quality layout design or if the creator possesses an extensive portfolio of finished works.</li>
</ul>
<p><strong>Future List Tier</strong></p>
<ul>
<li>The level must represent the highest echelon of quality or have substantial records set on it, indicating a very high and imminent likelihood of verification.</li>
<li>Levels on layout stage and levels with just-begun decoration are not eligible for this tier.</li>
</ul>

<h4>3. Standards for Verified Levels</h4>
<p>All officially rated levels are deemed to have met all criteria and are automatically included in all list tiers.</p>
<p>Among unrated but verified levels, only those that comply with the <a href="https://demonlist.org/guidelines" target="_blank">Global Demonlist Guidelines</a> are considered. Such levels are also added to all tiers of the list.</p>
                `
            },
            {
                id: 'determining-positions',
                title: 'Determining and adjusting level positions',
                content: `
<p>This section outlines the methodology for assigning and updating a level\u2019s rank within the list.</p>

<h4>1. Position Acquisition</h4>
<p>The source of a level\u2019s position depends on its official status:</p>
<ul>
<li>All rated levels are placed in strict accordance with their ranking on <a href="https://pointercrate.com" target="_blank">Pointercrate</a>. The calculation of these positions is defined in Pointercrate\u2019s own guidelines.</li>
<li>All unrated but verified levels are placed in strict accordance with their ranking on the <a href="https://demonlist.org" target="_blank">Global Demonlist</a>. The calculation of these positions is defined in the Global Demonlist Guidelines.</li>
<li>For upcoming levels, determining an exact position is often impossible due to factors like private copies and unfinished gameplay. In such cases, our team employs all available methods to estimate difficulty:
<ul>
<li>Requesting private copies directly from creators or testers.</li>
<li>Aggregating and analyzing difficulty estimates from experienced players.</li>
<li>Evaluating the relative difficulty of known level segments.</li>
</ul>
</li>
<li>If a level is in early development or subject to major changes, it is placed at the project\u2019s target position as stated by its author(s).</li>
</ul>
<p>Given the frequent lack of concrete data, any relevant information (e.g., gameplay footage, creator statements, tester feedback) shared in the #list-discussion or the #level-update-reporting channel will be reviewed and may lead to a position reassessment.</p>

<h4>2. Placement Timing &amp; Position Updates</h4>
<p><strong>Verified Levels (Rated &amp; Unrated):</strong> Most verified levels are added to the list shortly after verification, based on preliminary community estimates, even before their formal inclusion in official demonlists. Once they receive a final position on Pointercrate or the Global Demonlist, their rank in this list will be updated accordingly. Subsequent changes in the official demonlists will be mirrored here.</p>
<p><strong>Upcoming Levels:</strong> These levels are only assigned a position once tangible information about their difficulty emerges, which may take a considerable amount of time. Their position is subject to change based on new difficulty information, adjustments to the level\u2019s layout during verification, or other relevant circumstances.</p>
                `
            }
        ]
    },
    {
        group: 'Content Policy',
        id: 'content-policy',
        intro: `
<p>This section of the guidelines contains information about the list\u2019s policy regarding the placement, storage, and removal of content, including records, proof of their legitimacy, and levels.</p>
<p>First of all, the concept of the game\u2019s competitive scene is introduced as a metaphorical space in which players compete with each other. The entire policy of the list regarding content is built with the aim of reflecting, as much as possible, without neglecting property rights, the objective state of the competitive scene. This is the main principle that guides the list staff when making decisions regarding content on the site.</p>
        `,
        sections: [
            {
                id: 'list-records',
                title: 'List records',
                content: `
<p>Until reviewed by list staff, a player\u2019s records are considered the property of the player. Once a record is accepted, ownership is transferred to the list staff and they decide not to delete records at the player\u2019s request. The only exceptions are when a player is proven to be cheating, or when proof of legitimacy is unavailable due to suspicion of cheating, or if the account is a bypass.</p>
<p>Proof of the legitimacy of a record, whether it is a video recording of the record attempt posted on a video hosting site or the unedited raw footage file uploaded to a cloud storage, is always considered as the property of the player and can be freely deleted by them. However, it should be understood that in the future, during a possible review, records may be rejected due to the unavailability of proof. It is also possible to replace the video recording of the record attempt in case of reposting it to another link or rebeating the level as a whole, but only after the record has been reviewed again by list staff.</p>
<p>It should be noted that, guided by the main principle (see above), most records of players on the levels from the list may be added without their knowledge if the legitimacy of these records has been proven in one way or another.</p>
                `
            },
            {
                id: 'levels-thumbnails',
                title: 'Levels and thumbnails',
                content: `
<p>Levels published on the game\u2019s official server are considered the property of the game developer, and therefore the list staff has decided not to remove levels from the list at the request of the creators. The only exceptions are cases where a level is removed directly from the game servers, or if it no longer meets the selection criteria, for example, as a result of an update without verification.</p>
                `
            }
        ]
    },
    {
        group: 'Technical Support',
        id: 'support',
        intro: `
<p>This section of the guidelines contains information about technical support for the site, including the roles and areas of responsibility of the list staff, as well as ethical standards that list staff must adhere to when interacting with the community and responding to player inquiries.</p>
        `,
        sections: [
            {
                id: 'staff-roles',
                title: 'Staff roles and their areas of responsibility',
                content: `
<p>List staff members are assigned the following roles:</p>
<ol>
<li><strong>List Moderator / Elder List Moderator</strong>
<ul>
<li>Determining Level Positions</li>
<li>Placing Levels</li>
<li>Participating in quality control</li>
</ul>
</li>
<li><strong>Admin</strong>
<ul>
<li>Determining Level Positions</li>
<li>Placing Levels</li>
<li>Participating in quality control</li>
<li>Managing one of the list\u2019s sectors of work:
<ul>
<li>Server management \u2014 Exiled_shade</li>
<li>Level placements and quality control \u2014 VivisectionGD</li>
<li>Determining Level Positions and list tiers \u2014 QwidziT</li>
</ul>
</li>
</ul>
</li>
<li><strong>List Owner</strong>
<ul>
<li>Overall management of the list and its staff team</li>
</ul>
</li>
</ol>
<p>The primary (main) activity of staff members with this role is indicated in <strong>underlined</strong> font. If the most important thing is to get the best answer to a question, it is better to write to those whose activity overlaps with the indicated type of activity.</p>
                `
            },
            {
                id: 'ethical-standards',
                title: 'Ethical standards of list staff',
                content: `
<p>Since the members of the list staff are representatives of the project, there are strict rules regarding their behavior:</p>
<ul>
<li>It is prohibited to neglect one\u2019s duties without a valid reason;</li>
<li>It is prohibited to abuse of authority for personal gain or the gain of others;</li>
<li>It is prohibited to cause any harm directly to the list itself, as well as to similar projects;</li>
<li>It is prohibited to display any hostility or intolerance towards anyone or anything in public places and private discussions;</li>
<li>It is prohibited to disclose the personal information of players entrusted to list staff by providing additional proof of the legitimacy of the record, personal conversation with a staff member, or any other means.</li>
</ul>
<p>If any of the above points are violated, the player may report this to an Admin or directly to the List Leader.</p>
<p>In response to compliance with these rules, players are also asked to show respect and tolerance towards the list staff \u2014 any kind of insults or provocations may result in a justified refusal by the staff member to respond to the player\u2019s requests, and they have the right to do so.</p>
                `
            },
            {
                id: 'contacts',
                title: 'Contacts',
                content: `
<p><strong>List Owner:</strong></p>
<ul>
<li>QwidziT: Discord \u2014 @qwidzit | Telegram \u2014 @qwidzit</li>
</ul>
<p><strong>Admin:</strong></p>
<ul>
<li>VivisectionGD \u2014 Level placements and quality control: Discord \u2014 @vivisectiongd</li>
<li>Exiled_shade \u2014 Server management: Discord \u2014 @exiled_shade</li>
<li>QwidziT \u2014 Determining Level Positions and list tiers: Discord \u2014 @qwidzit | Telegram \u2014 @qwidzit</li>
</ul>
<p><strong>Elder List Moderator:</strong></p>
<ul>
<li>Niroi: Discord \u2014 @niroi_</li>
<li>Keres: Discord \u2014 @keresgmd</li>
<li>LukeLGamer: Discord \u2014 @lukelgamer</li>
</ul>
<p><strong>List Moderator / Trial List Moderator:</strong></p>
<ul>
<li>Terra: Discord \u2014 @.terralith</li>
<li>SixHunnid: Discord \u2014 @_sixhunnid_</li>
</ul>
                `
            }
        ]
    }
];
