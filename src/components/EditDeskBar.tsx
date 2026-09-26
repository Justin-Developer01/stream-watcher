import * as Slider from '@radix-ui/react-slider'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { ui } from '../lib/uiLabels'

type Props = {
  spacing: number
  onSpacing: (value: number) => void
  snap: boolean
  onSnap: (value: boolean) => void
  onDone: () => void
}

const SPACING_MIN = 2
const SPACING_MAX = 32
const SPACING_STEP = 2

/**
 * A compact frosted strip, not a Settings pane — floats over the top of the stage while Edit
 * Desk is on (StreamGrid's own overlay grid sits behind it, same accent). Everything here is
 * `data-hit` so it stays clickable through see-through's click-through path.
 */
export function EditDeskBar({ spacing, onSpacing, snap, onSnap, onDone }: Props) {
  return (
    <div className="edit-desk-bar" data-hit>
      <span className="edit-desk-bar__label">{ui.editDesk}</span>

      <label className="edit-desk-bar__spacing">
        <span>{ui.spacing}</span>
        {/* Same accent-filled track/thumb as the Phase A volume strip (.volume-slider) — one
            frost slider look across the app, no second style to keep readable in Light/Dark. */}
        <Slider.Root
          className="volume-slider edit-desk-bar__spacing-slider"
          min={SPACING_MIN}
          max={SPACING_MAX}
          step={SPACING_STEP}
          value={[spacing]}
          onValueChange={([value]) => onSpacing(value)}
        >
          <Slider.Track className="volume-slider__track">
            <Slider.Range className="volume-slider__range" />
          </Slider.Track>
          <Slider.Thumb className="volume-slider__thumb" aria-label={ui.spacing} />
        </Slider.Root>
        <span className="edit-desk-bar__spacing-value">{spacing}px</span>
      </label>

      <ToggleGroup.Root
        className="mode-group"
        type="single"
        value={snap ? 'snap' : 'drag'}
        onValueChange={(value) => {
          if (value) onSnap(value === 'snap')
        }}
      >
        <ToggleGroup.Item className={`mode-btn${!snap ? ' is-on' : ''}`} value="drag" aria-label={ui.drag}>
          {ui.drag}
        </ToggleGroup.Item>
        <ToggleGroup.Item className={`mode-btn${snap ? ' is-on' : ''}`} value="snap" aria-label={ui.snap}>
          {ui.snap}
        </ToggleGroup.Item>
      </ToggleGroup.Root>

      <button type="button" className="text-btn edit-desk-bar__done" onClick={onDone}>
        {ui.done}
      </button>
    </div>
  )
}
