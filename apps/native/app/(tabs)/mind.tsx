// The Mind tab (N9): screens/mind/MindTab, with Today's (N4) check-in sheet in its renderCheckin slot.
import { MindTab } from '../../screens/mind/MindTab'
import { CheckinSheet } from '../../screens/today/CheckinSheet'
export default function Screen() { return <MindTab renderCheckin={(onClose) => <CheckinSheet onClose={onClose} />} /> }
