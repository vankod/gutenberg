/**
 * External dependencies
 */
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { Component, createElement } from '@wordpress/element';

/**
 * Internal dependencies
 */
import './style.scss';

class Button extends Component {
	constructor( props ) {
		super( props );
		this.setRef = this.setRef.bind( this );
	}

	componentDidMount() {
		if ( this.props.focus ) {
			this.ref.focus();
		}
	}

	setRef( ref ) {
		this.ref = ref;
	}

	focus() {
		this.ref.focus();
	}

	render() {
		const {
			href,
			target,
			isLink,
			isDefault,
			isPrimary,
			isLarge,
			isSmall,
			isToggled,
			isBusy,
			className,
			disabled,
			...additionalProps
		} = this.props;
		const classes = classnames( 'components-button', className, {
			'is-button': isDefault || isPrimary || isLarge || isSmall,
			'is-default': isDefault || isLarge || isSmall,
			'is-primary': isPrimary,
			'is-large': isLarge,
			'is-small': isSmall,
			'is-toggled': isToggled,
			'is-busy': isBusy,
			'is-link': isLink,
		} );

		const tag = href !== undefined && ! disabled ? 'a' : 'button';
		const tagProps = tag === 'a' ? { href, target } : { type: 'button', disabled };

		delete additionalProps.focus;

		return createElement( tag, {
			...tagProps,
			...additionalProps,
			className: classes,
			ref: this.setRef,
		} );
	}
}

export default Button;
