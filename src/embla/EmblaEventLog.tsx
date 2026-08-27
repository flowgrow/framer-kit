import type { EmblaEventType } from 'embla-carousel';
import { ControlType, RenderTarget, type PropertyControls } from 'framer';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

import { useEmblaStore } from './store.js';

const CORE_EVENTS = [
  'init',
  'pointerDown',
  'pointerUp',
  'slidesChanged',
  'slidesInView',
  'scroll',
  'select',
  'settle',
  'destroy',
  'reInit',
  'resize',
  'slideFocusStart',
  'slideFocus',
] as const satisfies readonly EmblaEventType[];

const PLUGIN_EVENTS = [
  'autoplay:play',
  'autoplay:stop',
  'autoplay:select',
  'autoplay:timerset',
  'autoplay:timerstopped',
  'autoScroll:play',
  'autoScroll:stop',
] as const satisfies readonly EmblaEventType[];

const ALL_EVENTS = [...CORE_EVENTS, ...PLUGIN_EVENTS];

interface EventEntry {
  id: number;
  event: EmblaEventType;
  elapsed: number;
  selected: number;
  total: number;
  progress: number;
  scrollDelta: number;
}

export interface EmblaEventLogProps {
  carouselID?: string;
  maxEvents?: number;
  showScroll?: boolean;
  background?: string;
  textColor?: string;
  accentColor?: string;
  style?: CSSProperties;
}

export const emblaEventLogDefaults = {
  carouselID: 'kniff-carousel-1',
  maxEvents: 2000,
  showScroll: true,
  background: 'rgba(12, 12, 14, 0.94)',
  textColor: 'rgba(255, 255, 255, 0.72)',
  accentColor: '#8DFF65',
} as const;

function formatElapsed(elapsed: number): string {
  return `${(elapsed / 1000).toFixed(3)}s`;
}

/** Shows a live, bounded event trace for one registered Embla carousel. */
export function EmblaEventLog(props: EmblaEventLogProps) {
  const carouselID = props.carouselID ?? emblaEventLogDefaults.carouselID;
  const maxEvents = Math.max(
    1,
    Math.round(props.maxEvents ?? emblaEventLogDefaults.maxEvents)
  );
  const showScroll = props.showScroll ?? emblaEventLogDefaults.showScroll;
  const background = props.background ?? emblaEventLogDefaults.background;
  const textColor = props.textColor ?? emblaEventLogDefaults.textColor;
  const accentColor = props.accentColor ?? emblaEventLogDefaults.accentColor;
  const emblaApi = useEmblaStore(state => state.emblaInstances.get(carouselID));
  const [entries, setEntries] = useState<EventEntry[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const startedAt = useRef(0);
  const nextID = useRef(1);
  const lastScrollOffset = useRef(0);
  const isCanvas = RenderTarget.current() === RenderTarget.canvas;

  const clear = useCallback(() => {
    startedAt.current =
      typeof performance === 'undefined' ? 0 : performance.now();
    nextID.current = 1;
    lastScrollOffset.current =
      emblaApi?.internalEngine().offsetLocation.get() ?? 0;
    setEntries([]);
  }, [emblaApi]);

  useEffect(() => {
    clear();
    if (!emblaApi || isCanvas) return;

    const listeners = ALL_EVENTS.map(event => {
      const listener = () => {
        if (event === 'scroll' && !showScroll) return;

        const elapsed =
          typeof performance === 'undefined'
            ? 0
            : performance.now() - startedAt.current;
        const selected = emblaApi.selectedScrollSnap() + 1;
        const total = emblaApi.scrollSnapList().length;
        const progress = emblaApi.scrollProgress();
        const scrollOffset = emblaApi.internalEngine().offsetLocation.get();
        const scrollDelta = scrollOffset - lastScrollOffset.current;
        lastScrollOffset.current = scrollOffset;

        setEntries(current => {
          return [
            ...current,
            {
              id: nextID.current++,
              event,
              elapsed,
              selected,
              total,
              progress,
              scrollDelta,
            },
          ].slice(-maxEvents);
        });
      };

      emblaApi.on(event, listener);
      return [event, listener] as const;
    });

    return () => {
      for (const [event, listener] of listeners) {
        emblaApi.off(event, listener);
      }
    };
  }, [clear, emblaApi, isCanvas, maxEvents, showScroll]);

  const displayEntries = isCanvas
    ? [
        {
          id: 1,
          event: 'pointerDown' as const,
          elapsed: 184,
          selected: 1,
          total: 10,
          progress: 0,
          scrollDelta: 0,
        },
        {
          id: 2,
          event: 'select' as const,
          elapsed: 201,
          selected: 2,
          total: 10,
          progress: 0.11,
          scrollDelta: -138.42,
        },
        {
          id: 3,
          event: 'scroll' as const,
          elapsed: 684,
          selected: 2,
          total: 10,
          progress: 0.19,
          scrollDelta: -8.64,
        },
      ]
    : entries;

  useLayoutEffect(() => {
    const log = logRef.current;
    if (!log) return;
    log.scrollTop = log.scrollHeight;
  }, [entries]);

  return (
    <section
      aria-label={`Embla event log for ${carouselID}`}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        minWidth: 240,
        minHeight: 160,
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        borderRadius: 12,
        background,
        color: textColor,
        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.28)',
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: 11,
        lineHeight: 1.4,
        ...props.style,
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 7,
            height: 7,
            flex: '0 0 auto',
            borderRadius: '50%',
            background: emblaApi || isCanvas ? accentColor : '#FFB454',
            boxShadow: `0 0 10px ${emblaApi || isCanvas ? accentColor : '#FFB454'}`,
          }}
        />
        <strong
          style={{
            flex: 1,
            overflow: 'hidden',
            color: 'white',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          Embla · {carouselID}
        </strong>
        <button
          aria-label="Clear Embla event log"
          onClick={clear}
          style={{
            appearance: 'none',
            padding: 0,
            border: 0,
            background: 'transparent',
            color: textColor,
            cursor: 'pointer',
            font: 'inherit',
          }}
        >
          clear
        </button>
      </header>
      <div
        ref={logRef}
        aria-live="polite"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '8px 12px 12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            minHeight: '100%',
          }}
        >
          {!isCanvas && !emblaApi ? (
            <div style={{ paddingTop: 4, opacity: 0.7 }}>
              Waiting for carousel…
            </div>
          ) : displayEntries.length === 0 ? (
            <div style={{ paddingTop: 4, opacity: 0.7 }}>
              Move or interact with the carousel.
            </div>
          ) : (
            displayEntries.map(entry => (
              <div
                key={entry.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '58px minmax(0, 1fr)',
                  gap: 8,
                  padding: '3px 0',
                }}
              >
                <span style={{ opacity: 0.48 }}>
                  {formatElapsed(entry.elapsed)}
                </span>
                <span
                  style={{
                    overflow: 'hidden',
                    color: accentColor,
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {entry.event}
                </span>
                <span
                  style={{
                    gridColumn: '2 / -1',
                    opacity: 0.7,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {entry.selected}/{entry.total} ·{' '}
                  {Math.round(entry.progress * 100)}% · Δ{' '}
                  {entry.scrollDelta >= 0 ? '+' : ''}
                  {entry.scrollDelta.toFixed(2)}px
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

EmblaEventLog.displayName = 'Embla Event Log';

export const emblaEventLogPropertyControls = {
  carouselID: {
    title: 'ID',
    type: ControlType.String,
    defaultValue: emblaEventLogDefaults.carouselID,
    description: 'Use the same ID as the Carousel instance to inspect',
  },
  maxEvents: {
    title: 'Max Events',
    type: ControlType.Number,
    defaultValue: emblaEventLogDefaults.maxEvents,
    min: 5,
    max: 2000,
    step: 1,
    displayStepper: true,
  },
  showScroll: {
    title: 'Scroll Events',
    type: ControlType.Boolean,
    defaultValue: emblaEventLogDefaults.showScroll,
  },
  background: {
    title: 'Background',
    type: ControlType.Color,
    defaultValue: emblaEventLogDefaults.background,
  },
  textColor: {
    title: 'Text',
    type: ControlType.Color,
    defaultValue: emblaEventLogDefaults.textColor,
  },
  accentColor: {
    title: 'Accent',
    type: ControlType.Color,
    defaultValue: emblaEventLogDefaults.accentColor,
  },
} satisfies PropertyControls<EmblaEventLogProps>;
