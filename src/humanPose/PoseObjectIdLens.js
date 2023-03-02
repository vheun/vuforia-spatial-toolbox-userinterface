import * as THREE from "../../thirdPartyCode/three/three.module.js";
import AnalyticsColors from "./AnalyticsColors.js";
import AnalyticsLens from "./AnalyticsLens.js";

/**
 * PoseObjectIdLens is a lens that visually distinguishes between poses generated by different pose objects.
 */
class PoseObjectIdLens extends AnalyticsLens {
    /**
     * Creates a new PoseObjectIdLens object.
     */
    constructor() {
        super('Distinct People (Debug)');

        this.poseObjectIds = [];
        this.numeratorsForDenominator = {};
    }


    /**
     * Calculates the following sequence: 0, 1, 0.5, 0.25, 0.75, 0.125, 0.625, 0.375, 0.875...
     * This fills the range such that the distance between two values is maximally different without modifying earlier
     * values. This is necessary because we do not know ahead of time how many insertions there will be, otherwise we could
     * space the values evenly. Another benefit is that it ensures that values that are near each other in index order
     * are far apart in value order.
     * @param {number} index The index to calculate the value for.
     */
    maximallyDifferentPositionFromIndex(index) {
        if (index === 0) {
            return 0;
        }
        if (index === 1) {
            return 1;
        }
        // Smallest power of 2 greater than or equal to index
        const denominator = Math.pow(2, Math.ceil(Math.log2(index)));
        if (!this.numeratorsForDenominator[denominator]) {
            if (denominator === 2) {
                this.numeratorsForDenominator[denominator] = [1];
            } else {
                this.numeratorsForDenominator[denominator] = this.numeratorsForDenominator[denominator / 2].reduce((acc, numerator) => {
                    acc.push(numerator);
                    acc.push(numerator + denominator / 2);
                    return acc;
                }, []);
            }
        }
        const numeratorIndex = index - (denominator / 2) - 1;
        return this.numeratorsForDenominator[denominator][numeratorIndex] / denominator;
    }

    /**
     * Calculates the color for a given index.
     * @param {number} index The index to calculate the color for.
     * @return {Color} The color for the given index.
     */
    maximallyDifferentColorFromIndex(index) {
        const position = this.maximallyDifferentPositionFromIndex(index);
        const minH = 0; // red
        const maxH = 2/3; // blue
        return new THREE.Color().setHSL(minH + position * (maxH - minH), 1, 0.5);
    }
    
    applyLensToPose(pose) {
        if (Object.values(pose.joints).every(joint => joint.poseObjectId)) {
            return false;
        }
        if (!this.poseObjectIds.includes(pose.metadata.poseObjectId)) {
            this.poseObjectIds.push(pose.metadata.poseObjectId);
        }
        pose.forEachJoint(joint => {
            joint.poseObjectId = pose.metadata.poseObjectId;
        });
        pose.forEachBone(bone => {
            bone.poseObjectId = pose.metadata.poseObjectId;
        });
        return true;
    }

    applyLensToHistoryMinimally(poseHistory) {
        const modified = this.applyLensToPose(poseHistory[poseHistory.length - 1]);
        const modifiedArray = poseHistory.map(() => false);
        modifiedArray[modifiedArray.length - 1] = modified;
        return modifiedArray;
    }

    applyLensToHistory(poseHistory) {
        return poseHistory.map(pose => {
            return this.applyLensToPose(pose);
        });
    }

    /**
     * Gets the color for a given pose object id.
     * @param {string} id The pose object id.
     * @return {Color} The color for the given pose object id.
     */
    getColorFromId(id) {
        const index = this.poseObjectIds.indexOf(id);
        if (index === -1) {
            return AnalyticsColors.undefined;
        }
        return this.maximallyDifferentColorFromIndex(index);
    }
    
    getColorForJoint(joint) {
        return this.getColorFromId(joint.poseObjectId);
    }

    getColorForBone(bone) {
        return this.getColorFromId(bone.poseObjectId);
    }

    getColorForPose(pose) {
        return this.getColorFromId(pose.metadata.poseObjectId);
    }
}

export default PoseObjectIdLens;
