using UnityEngine;
using UnityEngine.InputSystem;

public class FrogController : MonoBehaviour
{
    [Header("Movement Settings")]
    [SerializeField] private float jumpForce = 10f;
    [SerializeField] private float moveSpeed = 5f;
    [SerializeField] private float rotationSpeed = 100f;
    
    [Header("Ground Check")]
    [SerializeField] private Transform groundCheck;
    [SerializeField] private float groundDistance = 0.4f;
    [SerializeField] private LayerMask groundMask;
    
    [Header("Animation")]
    [SerializeField] private Animator animator;
    
    private Rigidbody rb;
    private bool isGrounded;
    private Vector3 moveDirection;
    private bool isJumping;
    private float currentJumpTime;
    private float jumpDuration = 0.5f;
    
    private void Start()
    {
        rb = GetComponent<Rigidbody>();
        if (animator == null)
            animator = GetComponent<Animator>();
    }
    
    private void Update()
    {
        CheckGround();
        HandleMovement();
        HandleJump();
    }
    
    private void CheckGround()
    {
        isGrounded = Physics.CheckSphere(groundCheck.position, groundDistance, groundMask);
        
        if (isGrounded && isJumping)
        {
            isJumping = false;
            animator?.SetBool("IsJumping", false);
        }
    }
    
    private void HandleMovement()
    {
        if (isGrounded && !isJumping)
        {
            Vector3 movement = moveDirection * moveSpeed;
            rb.velocity = new Vector3(movement.x, rb.velocity.y, movement.z);
            
            if (moveDirection != Vector3.zero)
            {
                Quaternion targetRotation = Quaternion.LookRotation(moveDirection);
                transform.rotation = Quaternion.RotateTowards(transform.rotation, targetRotation, rotationSpeed * Time.deltaTime);
                animator?.SetBool("IsMoving", true);
            }
            else
            {
                animator?.SetBool("IsMoving", false);
            }
        }
    }
    
    private void HandleJump()
    {
        if (isJumping)
        {
            currentJumpTime += Time.deltaTime;
            if (currentJumpTime >= jumpDuration)
            {
                rb.velocity = new Vector3(rb.velocity.x, 0f, rb.velocity.z);
            }
        }
    }
    
    public void OnMove(InputValue value)
    {
        Vector2 input = value.Get<Vector2>();
        moveDirection = new Vector3(input.x, 0f, input.y);
    }
    
    public void OnJump(InputValue value)
    {
        if (value.isPressed && isGrounded && !isJumping)
        {
            Jump();
        }
    }
    
    private void Jump()
    {
        isJumping = true;
        currentJumpTime = 0f;
        rb.velocity = new Vector3(rb.velocity.x, jumpForce, rb.velocity.z);
        animator?.SetBool("IsJumping", true);
    }
    
    private void OnDrawGizmosSelected()
    {
        if (groundCheck != null)
        {
            Gizmos.color = Color.yellow;
            Gizmos.DrawWireSphere(groundCheck.position, groundDistance);
        }
    }
} 