/**
 * WordPress dependencies
 */
import { Component, createRef, compose } from '@wordpress/element';
import { createSlotFill, Button, IconButton } from '@wordpress/components';
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

const { Slot, Fill } = createSlotFill( 'NewUserTip' );

class NewUserTip extends Component {
	constructor() {
		super( ...arguments );

		this.anchorRef = createRef();
		this.advanceButtonRef = createRef();

		this.state = {
			position: {},
		};
	}

	componentDidMount() {
		this.setPosition();
	}

	componentDidUpdate( prevProps ) {
		if (
			this.props.currentStep !== prevProps.currentStep &&
			this.advanceButtonRef.current
		) {
			this.advanceButtonRef.current.focus();
		}
	}

	setPosition() {
		const anchor = this.anchorRef.current;
		if ( ! anchor || ! anchor.parentNode ) {
			return;
		}

		const rect = anchor.parentNode.getBoundingClientRect();
		this.setState( {
			position: {
				top: rect.top + ( rect.height / 2 ),
				left: rect.right,
			},
		} );
	}

	render() {
		const { id, currentStep, onAdvance, onDismiss } = this.props;
		const { position } = this.state;

		const { step, text } = TIPS[ id ];

		if ( currentStep !== step ) {
			return null;
		}

		return (
			<span ref={ this.anchorRef }>
				<Fill>
					<div
						className="editor-new-user-tip"
						style={ position }
						role="dialog"
						aria-modal="true"
						aria-label={ __( 'New User Guide' ) }
					>
						<div className="editor-new-user-tip__content">
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
						</div>
					</div>
				</Fill>
			</span>
		);
	}
}

const EnhancedNewUserTip = compose(
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

EnhancedNewUserTip.Slot = Slot;

export default EnhancedNewUserTip;
