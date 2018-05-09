/**
 * WordPress dependencies
 */
import { Component, createRef, compose } from '@wordpress/element';
import { Popover, Button, IconButton } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { withSelect, withDispatch } from '@wordpress/data';

/**
 * Internal dependencies
 */
import './style.scss';

const TIPS = {
	inserter: {
		step: 1,
		text: __( 'Welcome to the wonderful world of blocks! Click ‘Add block’ to insert different kinds of content—text, images, quotes, video, lists, and much more.' ),
	},
	settings: {
		step: 2,
		text: __( 'You’ll find more settings for your page and blocks in the sidebar. Click ‘Settings’ to open it.' ),
	},
	preview: {
		step: 3,
		text: __( 'Click ‘Preview’ to load a preview of this page, so you can make sure you’re happy with your blocks.' ),
	},
	publish: {
		step: 4,
		text: __( 'Finished writing? That’s great, let’s get this published right now. Just click ‘Publish’ and you’re good to go.' ),
	},
};

class NewUserTip extends Component {
	constructor() {
		super( ...arguments );

		this.advanceButtonRef = createRef();
	}

	componentDidUpdate( prevProps ) {
		if (
			this.props.currentStep !== prevProps.currentStep &&
			this.advanceButtonRef.current
		) {
			this.advanceButtonRef.current.focus();
		}
	}

	render() {
		const { id, currentStep, onAdvance, onDismiss } = this.props;

		const { step, text } = TIPS[ id ];

		if ( currentStep !== step ) {
			return null;
		}

		return (
			<Popover
				position="bottom right"
				className="editor-new-user-tip"
				role="dialog"
				aria-modal="true"
				aria-label={ __( 'New User Guide' ) }
				onClick={ ( event ) => event.stopPropagation() }
			>
				<p>{ text }</p>
				<p>
					<Button
						ref={ this.advanceButtonRef }
						isLarge
						isPrimary
						onClick={ onAdvance }
					>
						{ __( 'Next tip' ) }
					</Button>
				</p>
				<IconButton
					icon="no-alt"
					label={ __( 'Dismiss guide' ) }
					className="editor-new-user-tip__close"
					onClick={ onDismiss }
				/>
			</Popover>
		);
	}
}

export default compose(
	withSelect( ( select ) => {
		const { getCurrentNewUserGuideStep } = select( 'core/editor' );
		return {
			currentStep: getCurrentNewUserGuideStep(),
		};
	} ),
	withDispatch( ( dispatch ) => {
		const { advanceNewUserGuide, dismissNewUserGuide } = dispatch( 'core/editor' );
		return {
			onAdvance() {
				advanceNewUserGuide();
			},
			onDismiss() {
				dismissNewUserGuide();
			},
		};
	} ),
)( NewUserTip );
