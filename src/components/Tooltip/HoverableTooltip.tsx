import {BoundsObserver} from '@react-ng/bounds-observer';
import type {ForwardedRef} from 'react';
import React, {forwardRef, memo, useCallback, useRef} from 'react';
import Hoverable from '@components/Hoverable';
import * as DeviceCapabilities from '@libs/DeviceCapabilities';
import BaseTooltip from './BaseTooltip';
import type {HoverableTooltipProps, TooltipRect} from './types';

const hasHoverSupport = DeviceCapabilities.hasHoverSupport();

/**
 * A component used to wrap an element intended for displaying a tooltip. The term "tooltip's target" refers to the
 * wrapped element, which, upon hover, triggers the tooltip to be shown.
 * @param {propTypes} props
 * @returns {ReactNodeLike}
 */

/**
 * Choose the correct bounding box for the tooltip to be positioned against.
 * This handles the case where the target is wrapped across two lines, and
 * so we need to find the correct part (the one that the user is hovering
 * over) and show the tooltip there.
 *
 * @param {Element} target The DOM element being hovered over.
 * @param {number} clientX The X position from the MouseEvent.
 * @param {number} clientY The Y position from the MouseEvent.
 * @return {DOMRect} The chosen bounding box.
 */

function chooseBoundingBox(target: HTMLElement, clientX: number, clientY: number): DOMRect {
    const slop = 5;
    const bbs = target.getClientRects();
    const clientXMin = clientX - slop;
    const clientXMax = clientX + slop;
    const clientYMin = clientY - slop;
    const clientYMax = clientY + slop;

    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < bbs.length; i++) {
        const bb = bbs[i];
        if (clientXMin <= bb.right && clientXMax >= bb.left && clientYMin <= bb.bottom && clientYMax >= bb.top) {
            return bb;
        }
    }

    // If no matching bounding box is found, fall back to getBoundingClientRect.
    return target.getBoundingClientRect();
}

function HoverableTooltip({children, shouldHandleScroll = false, ...props}: HoverableTooltipProps, ref: ForwardedRef<BoundsObserver>) {
    const target = useRef<HTMLElement | null>(null);
    const initialMousePosition = useRef({x: 0, y: 0});

    const updateTargetAndMousePosition = useCallback((e: MouseEvent) => {
        if (!(e.currentTarget instanceof HTMLElement)) {
            return;
        }
        target.current = e.currentTarget;
        initialMousePosition.current = {x: e.clientX, y: e.clientY};
    }, []);

    /**
     * Get the tooltip bounding rectangle
     */
    const getBounds = (bounds: DOMRect): TooltipRect => {
        if (!target.current) {
            return bounds;
        }
        // Choose a bounding box for the tooltip to target.
        // In the case when the target is a link that has wrapped onto
        // multiple lines, we want to show the tooltip over the part
        // of the link that the user is hovering over.
        return chooseBoundingBox(target.current, initialMousePosition.current.x, initialMousePosition.current.y);
    };

    const updateTargetPositionOnMouseEnter = useCallback(
        (e: MouseEvent) => {
            updateTargetAndMousePosition(e);
            if (React.isValidElement(children)) {
                children.props.onMouseEnter?.(e);
            }
        },
        [children, updateTargetAndMousePosition],
    );

    // Skip the tooltip and return the children if the device does not support hovering
    if (!hasHoverSupport) {
        return children;
    }

    return (
        // eslint-disable-next-line react/jsx-props-no-spreading
        <BaseTooltip {...props}>
            {({isVisible, showTooltip, hideTooltip, updateBounds}) =>
                // Checks if valid element so we can wrap the BoundsObserver around it
                // If not, we just return the primitive children
                React.isValidElement(children) ? (
                    <BoundsObserver
                        enabled={isVisible}
                        onBoundsChange={(bounds) => {
                            updateBounds(getBounds(bounds));
                        }}
                        ref={ref}
                    >
                        <Hoverable
                            onHoverIn={showTooltip}
                            onHoverOut={hideTooltip}
                            shouldHandleScroll={shouldHandleScroll}
                        >
                            {React.cloneElement(children as React.ReactElement, {
                                onMouseEnter: updateTargetPositionOnMouseEnter,
                            })}
                        </Hoverable>
                    </BoundsObserver>
                ) : (
                    children
                )
            }
        </BaseTooltip>
    );
}

HoverableTooltip.displayName = 'Tooltip';

export default memo(forwardRef(HoverableTooltip));
