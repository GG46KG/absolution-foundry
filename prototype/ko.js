async function sendRollToChat() {
  var wounds = parseInt(($("#knockoutRollWounds").val() || "1"), 10)
  var gWounds = parseInt(($("#grievousWounds").val() || 0), 10)
  var me = token ? actor.name : "the character"

  knockoutRoll = new Roll(wounds + "d6cs<4 +" + gWounds);
  await knockoutRoll.evaluate();

  console.log(knockoutRoll.total)

  if (knockoutRoll.total == 0) {
    knockoutRoll.toMessage(
      {
        flavor: `<h2 style="font-size: 24px; margin: 10px 0 0 0; text-align:center">- Flesh Wound -</h2><div style="margin-bottom: 10px; font-size: 14px; font-style:italic; text-align: center;">Knockout Roll</div>The attack leaves only a flesh wound, and ${me} recovers Stamina with no further penalty.<hr/><div style="margin-bottom: 10px; padding: 0 4px; font-size: 12px; font-style: italic; font-family: serif; text-align: center;">Fight on, ${me}. Death hasn't come yet.</div>`,
        speaker: ChatMessage.getSpeaker({ actor: actor })
      }
    )
  } else if (knockoutRoll.total == 1) {

    subRoll = new Roll("1d6");
    await subRoll.evaluate();
    subValue = subRoll.total

    impairmentRollDesc = ''

    if (subRoll.total == 1 || subRoll.total == 2) {
        impairmentRollDesc = `<div style="font-size: 14px; font-weight: bold; font-style: italic;">${subRoll.total} - Deep Wound</div>One Wound becomes a Grievous Wound.`
    } else if (subRoll.total == 3 || subRoll.total == 4) {
        impairmentRollDesc = `<div style="font-size: 14px; font-weight: bold; font-style: italic;">${subRoll.total} - Vital Blow</div>${me} is <i>Exhausted</i> until the end of their next turn.`
    } else {
        impairmentRollDesc = `<div style="font-size: 14px; font-weight: bold; font-style: italic;">${subRoll.total} - Daze</div>${me} is <i>Impaired</i> until the end of their next turn.`
    }
    
    knockoutRoll.toMessage(
      {
        flavor: `<h2 style="font-size: 24px; margin: 10px 0 0 0; text-align:center">- Impairing Wound -</h2><div style="margin-bottom: 10px; font-size: 14px; font-style:italic; text-align: center;">Knockout Roll</div>${me} suffers an impairment, and rolls to determine the nature of the injury.<div style = 'margin-top: 10px; border: 2px black solid; border-radius: 4px; text-align: center; padding: 6px;'>${impairmentRollDesc}</div><hr/><div style="margin-bottom: 10px; padding: 0 4px; font-size: 12px; font-style: italic; font-family: serif; text-align: center;">The claws of Sin dig deeper into you, ${me}.</div>`,
        speaker: ChatMessage.getSpeaker({ actor: actor })
      }
    )
  } else if (wounds + gWounds <= 3) {
    knockoutRoll.toMessage(
      {
        flavor: `<h2 style="font-size: 24px; margin: 10px 0 0 0; text-align:center">- Concussion -</h2><div style="margin-bottom: 10px; font-size: 14px; font-style:italic; text-align: center;">Knockout Roll</div>At only ${wounds + gWounds} Wounds, ${me} is <i>Concussed</i>.<hr/><div style="margin-bottom: 10px; padding: 0 4px; font-size: 12px; font-style: italic; font-family: serif; text-align: center;">It's getting close now, ${me}. Stay standing, if you still can.</div>`,
        speaker: ChatMessage.getSpeaker({ actor: actor })
      }
    )
  } else {
    knockoutRoll.toMessage(
      {
        flavor: `<h2 style="font-size: 24px; margin: 10px 0 0 0; text-align:center">- Knockout -</h2><div style="margin-bottom: 10px; font-size: 14px; font-style:italic; text-align: center;">Knockout Roll</div>${me} succumbs to their Wounds and is <i>Incapacitated</i>.<hr/><div style="margin-bottom: 10px; padding: 0 4px; font-size: 12px; font-style: italic; font-family: serif; text-align: center;">It's all going dark...</div>`,
        speaker: ChatMessage.getSpeaker({ actor: actor })
      }
    )
  }
}

let dialogContent = `
  <label style='display: inline-block; width: 60%; vertical-align: middle;  margin: 1%;'>Number of Wounds</label>
  <input type='text' id='knockoutRollWounds' style='display: inline-block; vertical-align: middle; width: 35%; margin: 1%;' placeholder='1'>
  <label style='display: inline-block; width: 60%; vertical-align: middle;  margin: 1%;'>Number of Grievous Wounds</label>
  <input type='text' id='grievousWounds' style='display: inline-block; vertical-align: middle; width: 35%; margin: 1%;' placeholder='0'>
`

let rollTool = new Dialog({
  title: "Knockout Roll",
  content: dialogContent,
  buttons: {
    one: {
      label: "Roll",
      callback: () => sendRollToChat()
    }
  },
  default: "one",
});

rollTool.render(true);