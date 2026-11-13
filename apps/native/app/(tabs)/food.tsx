import { FoodScreen } from '../../screens/food/FoodScreen'
import { openLab } from '../../lib/labSheet'
export default function Screen() { return <FoodScreen onProfile={openLab} /> }
