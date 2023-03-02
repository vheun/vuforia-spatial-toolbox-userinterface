/**
 * AnalyticsLens is a class that represents a lens in the analytics system.
 * Inherit from this class to create new lenses.
 */
import {AnalyticsColors} from "./AnalyticsColors.js";

export class AnalyticsLens {
    /**
     * Creates a new AnalyticsLens object.
     * @param {string} name The name of the lens, used in menus.
     */
    constructor(name) {
        this.name = name;
    }

    /**
     * Resets the lens to its initial state.
     */
    reset() {
    }

    /**
     * Applies the lens to a single pose by adding new properties to the pose object.
     * @param {Pose} _pose The pose to apply the lens to.
     * @return {boolean} True if the pose was modified, false otherwise.
     */
    applyLensToPose(_pose) {
        return false;
    }

    /**
     * Applies the lens to the most recent pose, but reads the pose history as well. Only the minimum number of poses are visited.
     * @param {Pose[]} poseHistory An array of pose objects.
     * @return {boolean[]} An array of booleans, one for each pose in the history, indicating whether the pose was modified.
     */
    applyLensToHistoryMinimally(poseHistory) {
        return poseHistory.map(() => false);
    }

    /**
     * Applies the lens to the pose history by adding new properties to the pose objects.
     * @param {Pose[]} poseHistory An array of pose objects.
     * @return {boolean[]} An array of booleans, one for each pose in the history, indicating whether the pose was modified.
     */
    applyLensToHistory(poseHistory) {
        return poseHistory.map(() => false);
    }

    /**
     * Calculates the color for a given joint.
     * @param {Object} _joint The joint to calculate the color for.
     * @return {Color} The color to use for the value.
     */
    getColorForJoint(_joint) {
        return AnalyticsColors.undefined;
    }

    /**
     * Calculates the color for a given bone.
     * @param {Object} _bone The bone to calculate the color for.
     * @return {Color} The color to use for the value.
     */
    getColorForBone(_bone) {
        return AnalyticsColors.undefined;
    }

    /**
     * Calculates the color for a given pose.
     * @param {Pose} _pose The pose to calculate the color for.
     * @return {Color} The color to use for the value.
     */
    getColorForPose(_pose) {
        return AnalyticsColors.undefined;
    }
}
